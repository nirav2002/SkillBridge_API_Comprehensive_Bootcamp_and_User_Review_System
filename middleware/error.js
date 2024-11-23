// const errorResponse = require("../utils/errorResponse");
const ErrorResponse = require("../utils/errorResponse");

const errorHandler = (error, req, res, next) => {
  let errors = { ...error }; //Spread operator

  errors.message = error.message;

  //Log to console for dev
  console.log(error);

  //Mongoose bad ObjectId
  if (error.name === "CastError") {
    const message = `Resource not found`;
    errors = new ErrorResponse(message, 404);
  }

  //Mongoose duplicate key
  if (error.code === 11000) {
    const message = "Duplicate field value entered";
    errors = new ErrorResponse(message, 400);
  }

  //Mongoose validation error
  if (error.name === "ValidationError") {
    const message = Object.values(error.errors).map((val) => val.message);
    errors = new ErrorResponse(message, 400);
  }

  res.status(errors.statusCode || 500).json({
    success: false,
    error: errors.message || "Server Error",
  });
};

module.exports = errorHandler;
