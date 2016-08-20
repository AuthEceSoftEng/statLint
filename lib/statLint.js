var CompositeDisposable, statLint, statLintView;
//var checkSignatures, checkChains, checkVars;

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

statLintView = require('./statLint-view');
CompositeDisposable = require('atom').CompositeDisposable;
//checkSignatures = require('./checkSignatures');
//checkChains = require('./checkChains');
//checkVars = require('./checkVars');

module.exports = statLint = {
  statLintView: null,
  modalPanel: null,
  subscriptions: null,
  
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
  
  toggle: function() {
    
    var MessagePanelView = require('atom-message-panel').MessagePanelView,
        PlainMessageView = require('atom-message-panel').PlainMessageView;
        LineMessageView = require('atom-message-panel').LineMessageView;

    if(messages1 != undefined || messages1 != undefined || messages1 != undefined){
      messages1.delete();
      messages2.close();
      messages3.close(); 
    }
          
    var messages1 = new MessagePanelView({
      title: 'Function Signatures Results:'
    });

    var messages2 = new MessagePanelView({
      title: 'Function Chains Results:'
    });
 
    var messages3 = new MessagePanelView({
      title: 'Variable Declarations Results:'
    });
    
    var messages4 = new MessagePanelView({
      title: 'Assignments of calls :'
    });
 
    messages1.attach();
    messages2.attach();
    messages3.attach();
    messages4.attach();
    //messages1.toggle();

    var editor, words, code, ast;
    var count = 0;
    console.log('MyWordCount was toggled!');
    //if (this.modalPanel.isVisible()) {
    //  return this.modalPanel.hide();
    //}else {
    editor = atom.workspace.getActiveTextEditor();
    words = editor.getText().split(/\s+/).length;
    code = editor.getText();

    var esprima = require('esprima');
    var estraverse = require('estraverse');
    var fs = require('fs-extra');
    var _ = require('underscore');
      
    var search = require('./look4function.js')

    ast = esprima.parse(code,{loc: true});
	  	
    var nodeArray = [];
    var varArray = [];
    var asArray = [];
    var fun_chains = [];
    var finalArray = [];
    var registry = [];
    var varDecs = [];
    var endChain = 0;
    var parent = 0;
    var loc = 0;
    var assignLines = [];
    var assigned = false;
      
    // Creating the DB
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
    // the end
     
    // Creating the DB for chains
	  input = require('./functionChains.js');
	  var chainsDB = input.functionChains;
	  // the end
	  
	  // Creating the DB for var declarations
	  input = require('./varDeclarations.js');
	  var varDB = input.varDeclarations;
	  // the end 
	 
    estraverse.traverse(ast, {
      enter: enter,
      leave: leave
    });

    var messages = [];

    saveData(nodeArray);
    
    checkChains(fun_chains);
    checkSignatures(finalArray);

    saveVarData(varArray);
    checkVars(varDecs);

    function enter(node){
      if (node.type === 'VariableDeclarator'){
        varArray.push(node);
      }
      if(node.type === 'AssignmentExpression'){
        asArray.push(node);
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
        //if(!endChain){
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
        //}
		  }
    }
      
    function leave(node){
		  if (node.type === 'CallExpression'){
			//if(node.callee.type !== 'MemberExpression' || node.callee.type !== 'NewExpression'){
				if(registry.length >1){
					fun_chains.push({"C":registry.reverse(), "Assigned": assigned, "Loc": loc});
					//if(registry.length == 6) console.log(file+" and "+folder)
					//registry = [];
				}
				registry = [];
				loc = 0;
				assigned = false;
			//}
		  }
    }

    function chainMaker(node){
		  if(registry.length == 0){
				checkDecl = (_.find(varArray, function(elem){ return elem.init == node; }));
				checkAssign = (_.find(asArray, function(elem){ return elem.right == node; }));
				
				if( typeof checkDecl !== 'undefined'){
					assigned = true;
				}else if( typeof checkAssign !== 'undefined'){
					assigned = true;
				}
				loc = node.loc.start.line;
			}
			registry.push(node.callee.property.name);		
		}
		
    function checkSignatures(arr){
      for(i=0; i<arr.length; i++){
        var idf = [];
        var tf = [];

        var toSort = [];
        var result = searchDB(arr[i].FunctionName);
        if(result != undefined){
          if(search.look4function(result.FunctionName)){
            var signs = result.Signatures;
            for(j=0; j<signs.length; j++){
              tf[j] = signs[j].Count;
              idf[j] = Math.log10(95/signs[j].UniqueProjects);
              toSort.push({"Score": tf[j]/idf[j], "Index":j});
            }
            var compute = toSort.sort(function(a, b){
              return b.Score - a.Score; // descending order
            });
              
            // console.log("The best practice for function "+arr[i].Name+" is :"+signs[compute[0].Index].A);
            var txt = "The best practice for function "+arr[i].FunctionName+" in line "+arr[i].Loc+" is :"+signs[compute[0].Index].A;
            var txt1;
            var assignNum = signs[compute[0].Index].Assignments;

            //if(fun_chains.indexOf(arr[i].FunctionName) == -1){
              if(assignNum/signs[compute[0].Index].Count <= 1/3){
                if(arr[i].Assigned == true && assignLines.indexOf(arr[i].Loc) == -1){
                  messages4.add(new LineMessageView({
                    line: arr[i].Loc,
                    message: 'Possibly unlikely assignment !',
                    className: 'text-warning'
                  }));                
                }
              }else if(assignNum/signs[compute[0].Index].Count >= 1/3){
                if(arr[i].Assigned == false && assignLines.indexOf(arr[i].Loc) == -1){
                  messages4.add(new LineMessageView({
                    line: arr[i].Loc,
                    message: 'Possibly the result of this call should be assigned !',
                    className: 'text-warning'
                  }));
                }
              }
            //}
             
            var current = arr[i].Args;
            if(_.isEqual(signs[compute[0].Index].A,current)){
              //txt1 = "Well done !";
            }else{
              //txt1 = "Possibly unlikely signature !";
              //messages.push(txt1+" "+txt+"\n");
              messages1.add(new LineMessageView({
                line: arr[i].Loc,
                message: 'Possibly unlikely signature !',
                className: 'text-warning'
              }));
      
              messages1.add(new PlainMessageView({
                message: txt,
                className: 'text-success'
              }));
            }
             
          }
        }

      }
    }

    function checkChains(arr){
      for(i=0; i<arr.length; i++){
        var e ;
        var result = [];
        /*
        for(k=0; k<chainsDB.length; k++){
          for(j=0; j<arr[i].C.length; j++){
            e = (arr[i].C[j]);
          
            if(_.contains(chainsDB[k].C,e)){
              result.push(chainsDB[k]);
              break;
            } 
          } 
        }
        */
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
          var idf = [];
          var tf = [];

          var toSort = [];
          for(j=0; j<result.length; j++){
            tf[j] = result[j].Number;
            idf[j] = Math.log10(95/result[j].UniqueProjects);
            toSort.push({"Score": tf[j]/idf[j], "Index": j});
          }
          var compute = toSort.sort(function(a, b){
            return b.Score - a.Score; // descending order
          });

          var current = arr[i].C;
              
          var assignNum = result[compute[0].Index].Assignments;

          if(assignNum/result[compute[0].Index].Number <= 1/3){
            if(arr[i].Assigned == true){
              messages4.add(new LineMessageView({
                line: arr[i].Loc,
                message: 'Possibly unlikely assignment !',
                className: 'text-warning'
              }));
              assignLines.push(arr[i].Loc);                
            }
          }else if(assignNum/result[compute[0].Index].Number >= 1/3){
            if(arr[i].Assigned == false){
              messages4.add(new LineMessageView({
                line: arr[i].Loc,
                message: 'Possibly the result of this call should be assigned !',
                className: 'text-warning'
              }));
              assignLines.push(arr[i].Loc);                
            }
          }

          var warning2 = 1;
          var choices = compute.slice(0,1);
          for(j in choices){
            //if(result[choices[j].Index].C.length == current.length){            
            if( _.isEqual(result[choices[j].Index].C,current) ){
              warning2 = 0;
              break;
            }
            //}
          }
              
          var txt = "The best alternative for the function chain: "+arr[i].C+" in line "+arr[i].Loc+" is: "+result[choices[0].Index].C;
          var txt1;

          if(warning2){
            //txt1 = "Possibly unlikely chain !";
            //messages.push(txt1+" "+txt+"\n");
            messages2.add(new LineMessageView({
              line: arr[i].Loc,
              message: 'Possibly unlikely chain !',
              className: 'text-warning'
            }));

            messages2.add(new PlainMessageView({
              message: txt,
              className: 'text-success'
            }));
                  
          }else{
            //txt1 = "Well done !";
          }
              
        }
      }
    }
      
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
          
        var idf = [];
        var tf = [];

        var toSort = [];
        for(j=0; j<final_result.length; j++){
          tf[j] = final_result[j].Number;
          idf[j] = Math.log10(95/final_result[j].UniqueProjects);
          toSort.push({"Score": tf[j]/idf[j], "Index": j});
        }

        var compute = toSort.sort(function(a, b){
          return b.Score - a.Score; // descending order
        });
          
        var id = 0;
        while(final_result[compute[id].Index].T == 'empty' || final_result[compute[id].Index].T == 'undefined'){
          id++;
        }
          
        var best_option = final_result[compute[id].Index].T;
        //console.log("The best declaration type for the var: "+arr[i].Name+" in line "+arr[i].Loc+" is: "+best_option);
        var txt = "The best declaration type for the variable "+arr[i].Name+" in line "+arr[i].Loc+" is: "+best_option;
        var current = arr[i].Type;
          
        if(_.isEqual(final_result[compute[id].Index].T,current)){
          //txt1 = "Well done !";
        }else{
          //txt1 = "Possibly unlikely variable declaration !";
          //messages.push(txt1+" "+txt+"\n");
          messages3.add(new LineMessageView({
            line: arr[i].Loc,
            message: 'Possibly unlikely variable declaration !',
            className: 'text-warning'
          }));

          messages3.add(new PlainMessageView({
            message: txt,
            className: 'text-success'
          }));
        }
      }
    }

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
                }
              } 
            }

            if(!ok){
              for(p=0; p<asArray.length; p++){
                if(arr[i].arguments[j].name === asArray[p].left.name && asArray[p].right.type == 'ObjectExpression'){
                  info = 'object';
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
            //console.log("Variable: "+info+" with type of: "+t);
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
            finalArray.push({"FunctionName": obj.callee.property.name, "Args":args, "Assigned": assigned, "Loc": obj.loc.start.line}); 
          }
        }else{
          if(search.look4function(obj.name)){
            finalArray.push({"FunctionName": obj.callee.name, "Args": args, "Assigned": assigned, "Loc": obj.loc.start.line}); 
          }
        }
      }
    }

    function saveVarData(arr){
      for(i=0; i < arr.length; i++){
        var name = 'empty';
        var type = 'empty';
        if(arr[i].id.type === 'Identifier'){
          if( (arr[i].id.name).indexOf("arr") > -1 || arr[i].id.name.indexOf("ptr") > -1 || arr[i].id.name.indexOf("ind") > -1 || arr[i].id.name.indexOf("count") > -1 || arr[i].id.name == 'i' || arr[i].id.name == 'j'){
            name = arr[i].id.name;
            if(arr[i].init != null){
              if(arr[i].init.type === 'ObjectExpression'){
                type = 'Object';
              }else if(arr[i].init.type === 'ArrayExpression'){
                type = 'Array';
              }else if(arr[i].init.type === 'CallExpression'){
                type = 'Call';
              }else if(arr[i].init.type === 'Literal'){
                type = 'Literal';
              }
            }
            varDecs.push({"Name": name, "Type": type, "Loc": arr[i].loc.start.line});
          }
        }        
      }
    }

    // Evaluation process

    //this.statLintView.setCount(1000,messages);
    //return this.modalPanel.show();
  }
  //}
};
