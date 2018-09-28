// code from https://codeburst.io/throttling-and-debouncing-in-javascript-b01cad5c8edf

export default (func, delay) => {
  let inDebounce;

  return function() {
    const context = this,
      args = arguments;

    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  }
}