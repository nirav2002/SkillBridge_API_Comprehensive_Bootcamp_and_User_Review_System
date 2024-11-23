const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const logger = require("./middleware/logger"); //Importing logger
const colors = require("colors");
const fileupload = require("express-fileupload");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");
const errorHandler = require("./middleware/error");
const connectDB = require("./config/db");

//Load env vars
dotenv.config({ path: "./config/config.env" });

//Connect to database
connectDB();

//Route files
const bootcamp = require("./routes/bootcamps");
const courses = require("./routes/courses");
const auth = require("./routes/auth");
const users = require("./routes/users");
const reviews = require("./routes/reviews");

const app = express();

//Body parser middleware
app.use(express.json());

//Cookie parser
app.use(cookieParser());

//Dev logging middleware (morgan)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//FIle uploading
app.use(fileupload());

//Sanitize data
app.use(mongoSanitize());

//Set security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
//Prevent XSS attacks
app.use(xss());

//Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, //10 minutes
  max: 100,
});

app.use(limiter);

//Prevent http param pollution
app.use(hpp());

//Enable CORS
// if(process.env.NODE_ENV === 'development'){
//   app.use(cors());
// }

// Set static folder (Helps us access the contents of the file through Google)
// http://localhost:5000/uploads/photo_5d725a1b7b292f5f8ceff788.jpg will help us access one of the photos in the public folder.

app.use(express.static(path.join(__dirname, "public")));

//Mounting routers
app.use("/api/v1/bootcamps", bootcamp);
app.use("/api/v1/courses", courses);
app.use("/api/v1/auth", auth);
app.use("/api/v1/users", users);
app.use("/api/v1/reviews", reviews);
app.use(errorHandler);

//Starting the server only if this file is directly run
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
    );
  });

  //Handle unhandled promise rejections
  process.on("unhandledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

// Serve the API documentation from index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
