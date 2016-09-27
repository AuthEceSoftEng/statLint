/* The core code of the statLint package */

var CompositeDisposable, statLint, statLintView;
var toggled = false; // used to acknowledge when the package is toggled

var strict_level = 1; // Strict level of statLint: by default -> 1

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

statLintView = require('./statLint-view');
CompositeDisposable = require('atom').CompositeDisposable;

module.exports = statLint = {
  statLintView: null,
  modalPanel: null,
  subscriptions: null,
  
  /* DEFAULT FUNCTIONS OF THE MODULE */
  activate: function(state) {
    this.statLintView = new statLintView(state.statLintViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.statLintView.getElement(),
      visible: false
    });
    
    this.subscriptions = new CompositeDisposable;
    return this.subscriptions.add(atom.commands.add('atom-workspace', {
      'statLint:toggle': __bind(function() {
        return this.toggle();
      }, this)
    }));
  
  },
  
  deactivate: function() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    return this.statLintView.destroy();
  },
  
  serialize: function() {
    return {
      statLintViewState: this.statLintView.serialize()
    };
  },
  /* ----------- */

  // When the package is toggled, this method activates the functionality of the package 
  toggle: function() {
    if (toggled) {
      toggled = false;
      this.statLintView.reset();
    }else {
    
      toggled = true;

      var editor, code, ast;
      
      editor = atom.workspace.getActiveTextEditor();
      words = editor.getText().split(/\s+/).length;
      code = editor.getText();

      var esprima = require('esprima');
      var estraverse = require('estraverse');
      var fs = require('fs-extra');
      var _ = require('underscore');
        
      var search = require('./look4function.js')

      ast = esprima.parse(code,{loc: true}); // parsing the source code in the editor
  	  	
      var nodeArray = [];
      var varArray = [];
      var asArray = [];
      var fArray = [];
      var fun_chains = [];
      var finalArray = [];
      var registry = [];
      var varDecs = [];
      var endChain = 0;
      var parent = 0;
      var loc = 0;
      var assignLines = [];
      var assigned = false;
        
      // Creating the DB for the signatures
      var input = require('./functionSignatures.js');

      var DB = input.functionSignatures;

      var tagMap = {};
      var i = null;
      for (i = 0; DB.length > i; i += 1) {
        tagMap[DB[i].FunctionName] = DB[i];
      }

      var searchDB = function(value){
        return tagMap[value];
      };
       
      // Creating the DB for the chains
  	  input = require('./functionChains.js');
  	  var chainsDB = input.functionChains;
  	  
  	  // Creating the DB for variable declarations
  	  input = require('./varDeclarations.js');
  	  var varDB = input.varDeclarations;
  	  
      estraverse.traverse(ast, {
        enter: enter,
        leave: leave
      });

      var signatureWarnings = [];
          chainWarnings = [];
          variableWarnings = [];
          assignWarnings = [];

      // Processing and saving collected data
      saveData(nodeArray); // signatures, chains and assignments
      saveVarData(varArray); // variable declarations
      
      // Checking for violations
      checkChains(fun_chains); // of chains
      checkSignatures(finalArray); // of signatures 
      checkVars(varDecs); // of variable declarations

      // collection of the data after entering each node
      function enter(node){
        if (node.type === 'VariableDeclarator'){
          varArray.push(node);
        }
        if(node.type === 'AssignmentExpression'){
          asArray.push(node);
        }
        if(node.type === 'FunctionDeclaration'){
          fArray.push(node);
        }
        if(node.type === 'CallExpression'){
          nodeArray.push(node);
          if(parent == 0){

          }else if(parent.object !== node){
  					endChain = 1;
          }

          if(endChain){
  				  endChain = 0;
  				  if(registry.length >1){
              fun_chains.push({"C":registry.reverse(), "Assigned": assigned, "Loc": loc});
  				  }
  				  registry = [];
  				  loc = 0;
  				  assigned = false;
          }
          
          if(node.callee.type === 'MemberExpression'){
  				  parent = node.callee;
  					if(node.callee.object.type === 'CallExpression' || node.callee.object.type === 'NewExpression' || node.callee.object.type === 'Identifier' || node.callee.object.type === 'ArrayExpression'){
  						//console.log(node.callee.property.name);
  						if(node.callee.property.type === 'Identifier' && (search.look4function(node.callee.property.name))){
  							//console.log(node.callee.property.name);
  							chainMaker(node);
  						}	
  					}
  				}

  		  }
      }
      
      // collection of data for function chains after leaving the node
      function leave(node){
  		  if (node.type === 'CallExpression'){
  				if(registry.length >1){
  				  fun_chains.push({"C":registry.reverse(), "Assigned": assigned, "Loc": loc});
  				}
  				registry = [];
  				loc = 0;
  				assigned = false;
  		  }
      }

      // insertion of the methods participating in a function chain
      function chainMaker(node){
  		  if(registry.length == 0){
  				checkDecl = (_.find(varArray, function(elem){ return elem.init == node; })); // check if the chain is used to declare a variable
  				checkAssign = (_.find(asArray, function(elem){ return elem.right == node; })); // check if the return value of the chain is assigned to a value
  				
          // giving the variable "assigned" the proper value: true or false
  				if( typeof checkDecl !== 'undefined'){
  					assigned = true;
  				}else if( typeof checkAssign !== 'undefined'){
  					assigned = true;
  				}

  				loc = node.loc.start.line; // saving the line where the chain begins
  			}
  			
        registry.push(node.callee.property.name); // finalizing the insertion
  		}
  		
      // check for function signatures deviations
      function checkSignatures(arr){
        for(i=0; i<arr.length; i++){
          var mdf = [];
          var tf = [];

          var toSort = [];
          var result = searchDB(arr[i].FunctionName);
          if(result != undefined){
            if(search.look4function(result.FunctionName)){
              var signs = result.Signatures;
              for(j=0; j<signs.length; j++){
                tf[j] = signs[j].Count;
                mdf[j] = Math.log10(1 + (signs[j].UniqueProjects/100));
                toSort.push({"Score": tf[j]*mdf[j], "Index":j});
              }
              var compute = toSort.sort(function(a, b){
                return b.Score - a.Score; // descending order
              });

              var choices = compute.slice(0,strict_level);

              
              var txt1;  
              var txt = "The best practice for function "+arr[i].FunctionName+" in line "+arr[i].Loc+" is :"+signs[compute[0].Index].Signature;
              
              var current = arr[i].Signature;
              var warning = 1;
              var choice_index = -1;

              for(j in choices){
                if(_.isEqual(signs[choices[j].Index].Signature,current)){
                  //txt1 = "Well done !";
                  warning = 0;
                  choice_index = choices[j].Index;
                  break;
                }  
              }

              if(warning){ // signature warning
                signatureWarnings.push({"line": arr[i].Loc, "message": txt});
              }else{ // check for assignment warning
                var assignNum = signs[choice_index].Assignments;

                if(assignNum/signs[choice_index].Count <= 1/3){
                  if(arr[i].Assigned == true && assignLines.indexOf(arr[i].Loc) == -1){
                    assignWarnings.push({"line": arr[i].Loc, "message": 'Possibly unlikely assignment !'});               
                  }
                }else if(assignNum/signs[choice_index].Count >= 1/3){
                  if(arr[i].Assigned == false && assignLines.indexOf(arr[i].Loc) == -1){
                    assignWarnings.push({"line": arr[i].Loc, "message": 'Possibly the result of this call should be assigned !'});
                  }
                }
              }
              
            }
          }

        }
      }

      // check for function chains deviations
      function checkChains(arr){
        for(i=0; i<arr.length; i++){
          var e ;
          var result = [];
          
          var given = [];
          for(j=0; j<arr[i].C.length; j++){
            e = arr[i].C[j];
            given.push(e);
          }
          for(k=0; k<chainsDB.length; k++){
            var include = 1;
            for(j=0; j<given.length; j++){
              if(_.indexOf(chainsDB[k].C,given[j]) == -1){
                include = 0;
                break;
              } 
            }
            if(include) result.push(chainsDB[k]); 
          }

          if(result.length > 0){     
            var mdf = [];
            var tf = [];

            var toSort = [];
            for(j=0; j<result.length; j++){
              tf[j] = result[j].Number;
              mdf[j] = Math.log10(1 + (result[j].UniqueProjects/100));  
              toSort.push({"Score": tf[j]*mdf[j], "Index": j});
            }
            var compute = toSort.sort(function(a, b){
              return b.Score - a.Score; // descending order
            });

            var choices = compute.slice(0,strict_level);

            var current = arr[i].C;
                
            var warning2 = 1;
            var choice_index = -1;
            
            for(j in choices){
              if( _.isEqual(result[choices[j].Index].C,current) ){
                warning2 = 0;
                choice_index = choices[j].Index;
                break;
              }
            }
                
            var txt = "The best alternative for the function chain: "+arr[i].C+" in line "+arr[i].Loc+" is: "+result[choices[0].Index].C;
            var txt1;

            if(warning2){ // chain warning
              chainWarnings.push({"line": arr[i].Loc, "message": txt});
            }else{ // check for assignment warning
              //txt1 = "Well done !";
              var assignNum = result[choice_index].Assignments;

              if(assignNum/result[choice_index].Number <= 1/3){
                if(arr[i].Assigned == true){
                  assignWarnings.push({"line": arr[i].Loc, "message": 'Possibly unlikely assignment !'})
                  assignLines.push(arr[i].Loc);                
                }
              }else if(assignNum/result[choice_index].Number >= 1/3){
                if(arr[i].Assigned == false){
                  assignWarnings.push({"line": arr[i].Loc, "message": 'Possibly the result of this call should be assigned !'});
                  assignLines.push(arr[i].Loc);                
                }
              }
            }
                
          }
        }
      }
        
      // check for any unlikely variable declarations
      function checkVars(arr){
        for(i=0; i<arr.length; i++){
          var e ;
          var result = [];
          for(k=0; k<varDB.length; k++){
            if(varDB[k].Name.indexOf(arr[i].Name) > -1 && varDB[k].Name.length <= 2+arr[i].Name.length){
              result.push(varDB[k]);
            }
          } 

          var hist =[];
          var hist2 = [];
          hist = _.groupBy(result,function(ele){ return ele.Type; });
          hist2 = _.countBy(result,function(ele){ return ele.Type; });

          var final_result = [];

          for(j in Object.keys(hist)){
            var result = hist[Object.keys(hist)[j]];

            var hist3 =[];
            hist3 = _.countBy(result,function(ele){ return ele.Project; }); 

            var projects = Object.keys(hist3).length;

            final_result.push({"T": Object.keys(hist2)[j], "Number": hist2[Object.keys(hist2)[j]], "UniqueProjects":projects});
          }
            
          var mdf = [];
          var tf = [];

          var toSort = [];
          for(j=0; j<final_result.length; j++){
            tf[j] = final_result[j].Number;
            mdf[j] = Math.log10(1 + (final_result[j].UniqueProjects/100));
            toSort.push({"Score": tf[j]*mdf[j], "Index": j});
          }

          var compute = toSort.sort(function(a, b){
            return b.Score - a.Score; // descending order
          });

          var choices = compute.slice(0,strict_level);
          var current = arr[i].Type;
          var best_option = final_result[compute[0].Index].T;
          var txt = "The best declaration type for the variable "+arr[i].Name+" in line "+arr[i].Loc+" is: "+best_option;
          
          if(final_result.length > 0){
            var warning3 = 1;

            if(current == 'noValue'){
              warning3 = 0;
            }else{
              for(j in choices){
                if( _.isEqual(final_result[choices[j].Index].T,current)){
                  warning3 = 0;
                  choice_index = choices[j].Index;
                  break;
                }
              }
            }

            if(warning3){
              variableWarnings.push({"line": arr[i].Loc, "message": txt});
            } 

          }  
          
        }
      }

      /* METHODDS IN ORDER TO PROCESS AND SAVE THE COLLECTED DATA*/

      // First method: saving the data that pertain to function signatures, function chains and their assignments
      function saveData(arr){
        for (i = 0; i < arr.length; i++){
          var args = [];
          for(j in arr[i].arguments){
            var info;
            var ok = 0;

            if(arr[i].arguments[j].type ==="Identifier"){
              for(p=0; p<varArray.length; p++){
                if(arr[i].arguments[j].name === varArray[p].id.name && varArray[p].init != null ){ 
                  if(varArray[p].init.type == 'ObjectExpression'){
                    info = 'object';
                    ok = 1;
                    break;
                  }else if(varArray[p].init.type == 'FunctionExpression'){
                    info = 'function';
                    ok = 1;
                    break;
                  }
                } 
              }

              if(!ok){
                for(p=0; p<asArray.length; p++){
                  if(arr[i].arguments[j].name === asArray[p].left.name && asArray[p].right.type == 'ObjectExpression'){
                    info = 'object';
                    ok = 1;
                    break;
                  }else if(arr[i].arguments[j].name === asArray[p].left.name && asArray[p].right.type == 'FunctionExpression'){
                    info = 'function';
                    ok = 1;
                    break;
                  } 
                } 
              }           
              if(!ok){
                  for(p=0; p<fArray.length; p++){
                    if(arr[i].arguments[j].name === fArray[p].id.name ){
                      info = 'function';
                      ok = 1;
                      break;
                    } 
                  } 
                }           
            }else if(arr[i].arguments[j].type === 'FunctionExpression'){
                info = 'function';
                ok = 1;
            }else if(arr[i].arguments[j].type === 'ObjectExpression'){
                info = 'object';
                ok = 1;
            }

            if(ok){
              ok = 0;
              args.push(info);
            }else{
              info = "primitive";
              args.push(info);
            }
          }

          if(args.length == 0){
            args.push("NoArg");
          }

          var obj = arr[i];
          checkDecl = (_.find(varArray, function(elem){ return elem.init == obj; }));
          checkAssign = (_.find(asArray, function(elem){ return elem.right == obj; }));

          var assigned = false;
          if( typeof checkDecl !== 'undefined'){
            assigned = true;
          }else if( typeof checkAssign !== 'undefined'){
            assigned = true;
          }

          if(obj.callee.type === 'MemberExpression'){
            if(search.look4function(obj.callee.property.name)){
              finalArray.push({"FunctionName": obj.callee.property.name, "Signature":args, "Assigned": assigned, "Loc": obj.loc.start.line}); 
            }
          }else{
            if(search.look4function(obj.name)){
              finalArray.push({"FunctionName": obj.callee.name, "Signature": args, "Assigned": assigned, "Loc": obj.loc.start.line}); 
            }
          }
        }
      }

      // Second method: saving the data that pertain to variable declarations with common and anticipated names
      function saveVarData(arr){
        for(i=0; i < arr.length; i++){
          if(arr[i].id.type === 'Identifier'){
              if( (arr[i].id.name).indexOf("arr") > -1 || arr[i].id.name.indexOf("ptr") > -1 || arr[i].id.name.indexOf("ind") > -1 || arr[i].id.name.indexOf("count") > -1 || arr[i].id.name == 'i' || arr[i].id.name == 'j'){
                  var name = arr[i].id.name;
                  var type;
                  if(arr[i].init != null){
                      if(arr[i].init.type === 'ObjectExpression'){
                          type = 'Object';
                      }else if(arr[i].init.type === 'ArrayExpression'){
                          type = 'Array';
                      }else if(arr[i].init.type === 'CallExpression'){
                          type = 'Call';
                      }else if(arr[i].init.type === 'Literal'){
                          type = 'Literal';
                      }else{
                          type = 'noValue';
                      }
                    }
                    varDecs.push({"Name": name, "Type": type, "Loc": arr[i].loc.start.line});
              }
          }        
        }
      }

      // Send the messages to the statLintView
      this.statLintView.showout(signatureWarnings, chainWarnings, variableWarnings, assignWarnings);
    }
  }
};
