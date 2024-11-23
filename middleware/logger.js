//@desc    Logs request to console

//Middleware function
const logger = (req, res, next) => {
  console.log(
    `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl}`
  );
  next(); //next has to be called so it knows that it has to move on to the next piece of middleware in the cycle
};

module.exports = logger;
