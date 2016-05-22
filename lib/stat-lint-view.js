var statLintView;

module.exports = statLintView = (function() {
  
  function statLintView(serializedState) {
    var message;
    this.element = document.createElement('div');
    this.element.classList.add('my-parsing');
    message = document.createElement('div');
    message.textContent = "The MyParsing package is Alive! It's ALIVE!";
    message.classList.add('message');
    this.element.appendChild(message);
  }
  
  statLintView.prototype.serialize = function() {};
  
  statLintView.prototype.destroy = function() {
    return this.element.remove();
  };
  
  statLintView.prototype.getElement = function() {
    return this.element;
  };
  
  statLintView.prototype.setCount = function(count,messages) {
    
    var displayText = "There are " + count + " words in this source code.";
	
	this.element.children[0].textContent = displayText;
    
	while(this.element.children.length > 1){
		this.element.removeChild(this.element.lastChild);
	}

	var mes = [];
	
	  for(i=0; i<messages.length; i++){
		  mes[i] = document.createElement('div');
	   	//mes[i].textContent = "Detected leaked global variable: "+variables[i];
      	mes[i].textContent = messages[i];
		mes[i].classList.add('mes[i]');
		  this.element.appendChild(mes[i]);
	  }
	
    /*var newposition = mes.length;
	  mes[newposition] = document.createElement('div');
	  mes[newposition].textContent = "There are "+count2+" function calls.";
	  mes[newposition].classList.add('mes[newposition]');
	  this.element.appendChild(mes[newposition]);*/
	
	  return this.element.children.textContent;
  };
  
  return statLintView;

})();
