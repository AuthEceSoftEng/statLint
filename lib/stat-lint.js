var CompositeDisposable, statLint, statLintView;

var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

statLintView = require('./stat-lint-view');
CompositeDisposable = require('atom').CompositeDisposable;

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
      'stat-lint:toggle': __bind(function() {
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
    var editor, words, code, ast;
    var count = 0;
    console.log('MyWordCount was toggled!');
    if (this.modalPanel.isVisible()) {
      return this.modalPanel.hide();
    }else {
      editor = atom.workspace.getActiveTextEditor();
      words = editor.getText().split(/\s+/).length;
      code = editor.getText();

      var esprima = require('esprima');
      var estraverse = require('estraverse');
      var fs = require('fs-extra');
      var _ = require('underscore');
      var underscore = require('./underscore.js');


      ast = esprima.parse(code,{loc: true});
	  	
      var nodeArray = [];
      var varArray = [];
      var asArray = [];
      var fun_chains = [];
      var finalArray = [];

      // Creating the DB
      var input = require('./final-data.js');

      var DB = input.final_data;

      var tagMap = {};
      var i = null;
      for (i = 0; DB.length > i; i += 1) {
          tagMap[DB[i].FunctionName] = DB[i];
      }

      var searchDB = function(value){
        return tagMap[value];
      };
      // the end

      estraverse.traverse(ast, {
        enter: enter,
        leave: leave
      });

      var messages = [];

      saveData(nodeArray);
      checkSignatures(finalArray);

      function enter(node){
        if (node.type === 'CallExpression'){
          nodeArray.push(node);
        }
        if (node.type === 'VariableDeclarator'){
          varArray.push(node);
        }
        if(node.type === 'AssignmentExpression'){
          asArray.push(node);
        }
      }
      
      function leave(node){}
      
      function checkSignatures(arr){
        for(i=0; i<arr.length; i++){
          var idf = [];
          var tf = [];

          var toSort = [];
          var result = searchDB(arr[i].Name);
          if(result != undefined){
            if(underscore.functions.indexOf(result.FunctionName) != -1){
              var signs = result.Arguments;
              for(j=0; j<signs.length; j++){
                tf[j] = signs[j].Count;
                idf[j] = Math.log10(51/signs[j].UniqueProjects);
                toSort.push({"Score": idf[j], "Index":j});
              }
              var compute = toSort.sort(function(a, b){
                  return a.Score - b.Score;
              });
              
             // console.log("The best practice for function "+arr[i].Name+" is :"+signs[compute[0].Index].A);
             var txt = "The best practice for function "+arr[i].Name+" in line "+arr[i].Loc+" is :"+signs[compute[0].Index].A;
             var txt1;
             
             var current = arr[i].Args;
             if(_.isEqual(signs[compute[0].Index].A,current)){
                //txt1 = "Well done !";
             }else{
                txt1 = "Possibly unlikely signature !";
                messages.push(txt1+" "+txt+"\n");
             }
             
            }
          }

        }
      }

      function checkChains(arr){

      }
    
      function saveData(arr){
        for (i = 0; i < arr.length; i++) {
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

          if(obj.callee.type === 'MemberExpression'){
            if(underscore.functions.indexOf(obj.callee.property.name) != -1){
              finalArray.push({"Name": obj.callee.property.name, "Args":args, "Loc": obj.loc.start.line}); 
            }
          }else{
            if(underscore.functions.indexOf(obj.name) != -1){
              finalArray.push({"Name": obj.callee.name, "Args": args, "Loc": obj.loc.start.line}); 
            }
          }
        }
      }


      // Evaluation process


      //var messages2 = [DB[0].FunctionName, DB[0].Number]
      this.statLintView.setCount(1000,messages);
      return this.modalPanel.show();
    }
  }

};
