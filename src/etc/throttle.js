// code from https://codeburst.io/throttling-and-debouncing-in-javascript-b01cad5c8edf

export default (func, limit) => {
  let lastFunc, lastRan;

  return function() {
    const context = this,
      args = arguments;

    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  }
}