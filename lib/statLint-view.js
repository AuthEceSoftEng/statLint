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
  
  return statLintView;

})();
