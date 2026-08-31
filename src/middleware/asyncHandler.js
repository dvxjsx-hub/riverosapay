// antes, si un controller async tiraba una excepción sin capturarla,
// podía terminar en un "unhandled rejection" y tumbar el proceso.
// Esto envuelve cada controller y manda el error a errorHandler.js.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
