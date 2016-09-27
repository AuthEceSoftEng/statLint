/* The view of the statLint package */

var statLintView;

module.exports = statLintView = (function() {

  function statLintView(serializedState) {
    var message;
    this.element = document.createElement('div');
    this.element.classList.add('statLint');
    message = document.createElement('div');
    message.textContent = "The statLint package is Alive! It's ALIVE!";
    message.classList.add('message');
    this.element.appendChild(message);
  }
  
  // Require the entities from atom-message-panel
  var MessagePanelView = require('atom-message-panel').MessagePanelView,
      PlainMessageView = require('atom-message-panel').PlainMessageView;
      LineMessageView = require('atom-message-panel').LineMessageView;

  // messages1: The messages providing info about the signature warnings
  var messages1 = new MessagePanelView({
    title: 'Function Signatures Results:'
  });

  // messages2: The messages providing info about the chain warnings
  var messages2 = new MessagePanelView({
    title: 'Function Chains Results:'
  });
 
  // messages3: The messages providing info about the variable warnings
  var messages3 = new MessagePanelView({
    title: 'Variable Declarations Results:'
  });
    
  // messages4: The messages providing info about the assignment warnings
  var messages4 = new MessagePanelView({
    title: 'Assignments of calls :'
  });

  /* DEFAULT FUNCTIONS OF THE VIEW */
  statLintView.prototype.serialize = function() {};
  
  statLintView.prototype.destroy = function() {
    return this.element.remove();
  };
  
  statLintView.prototype.getElement = function() {
    return this.element;
  };
  /* ----------- */

  // The showout function is called as soon as the package is toggled in order to inform the user with the existing messages 
  statLintView.prototype.showout = function(signatureWarnings, chainWarnings, variableWarnings, assignWarnings) {
    this.messages1 = messages1;
    this.messages2 = messages2;
    this.messages3 = messages3;
    this.messages4 = messages4;

    // provide the signatureWarnings to the atom-message-panel objects
    for(i in signatureWarnings){
      messages1.add(new LineMessageView({
        line: signatureWarnings[i].line,
        message: 'Possibly unlikely signature !',
        className: 'text-warning'
      }));
      
      messages1.add(new PlainMessageView({
        message: signatureWarnings[i].message,
        className: 'text-success'
      }));
    }

    // provide the chainWarnings to the atom-message-panel objects
    for(i in chainWarnings){
      messages2.add(new LineMessageView({
        line: chainWarnings[i].line,
        message: 'Possibly unlikely signature !',
        className: 'text-warning'
      }));
      
      messages2.add(new PlainMessageView({
        message: chainWarnings[i].message,
        className: 'text-success'
      }));
    }

    // provide the variableWarnings to the atom-message-panel objects
    for(i in variableWarnings){
      messages3.add(new LineMessageView({
        line: variableWarnings[i].line,
        message: 'Possibly unlikely variable declaration !',
        className: 'text-warning'
      }));

      messages3.add(new PlainMessageView({
        message: variableWarnings[i].message,
        className: 'text-success'
      }));
    }

    // provide the assignWarnings to the atom-message-panel objects
    for(i in assignWarnings){
      messages4.add(new LineMessageView({
        line: assignWarnings[i].line,
        message: assignWarnings[i].message,
        className: 'text-warning'
      }));
    }
    
    if(signatureWarnings.length > 0){
      messages1.attach();
    }
    if(chainWarnings.length > 0){
      messages2.attach();
    }
    if(variableWarnings.length > 0){
      messages3.attach();
    }
    if(assignWarnings.length > 0){
      messages4.attach();
    }

    // If there is no warning at all, inform the user accordingly
    if(signatureWarnings.length == 0 && chainWarnings.length == 0 && variableWarnings.length == 0 && assignWarnings.length == 0){
      messages1.add(new PlainMessageView({
        message: 'No deviations detected by statLint !',
        className: 'text-success'
      }));
    }

  }

  // The reset function is called when the package is toggled in order to clear the messages
  statLintView.prototype.reset = function(count) {
    this.messages1.clear();
    this.messages1.close();
    
    this.messages2.clear();
    this.messages2.close();
    
    this.messages3.clear();
    this.messages3.close();
    
    this.messages4.clear();
    this.messages4.close();
  }
  
  return statLintView; // return the view to the Atom panel

})();
