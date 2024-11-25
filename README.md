# SkillBridge API: Comprehensive Bootcamp and User Review System

The SkillBridge API system is a comprehensive backend system that stimulates the management of bootcamps, courses, user reviews, and authentication. Designed for learning purposes, this project provides a platform where bootcamps offering professional training can register, manage their offerings, and interact with users. Users can explore bootcamps, enroll in courses, and leave reviews to share their experiences.

Build using JS and its frameworks including Node.js and Express.js alongside MongoDB, this project showcases essential backend development skills and concepts, such as advanced filtering, pagination, and role-based access control (RBAC).

<br>

## Key functionality

- Bootcamps and Courses: Publishers (authorized personnel) can register bootcamps and add detailed course information for prospective students.

- User Roles: The system supports multiple user roles, such as publishers (who manage bootcamps) and general users (who browse and review bootcamps)

- Reviews: Users can leave detailed reviews and ratings for specific bootcamps to help others make informed decisions.

- Search and Filtering: Advanced query capabilities allow users to find bootcamps by location, price range, and course offerings.

<br>

## Project Workflow

1. **Database Design and Setup**:

   - MongoDB is used as the database, connected to the application using the Mongoose library.
   - Schemas are created for Bootcamp, Course, User, and Review, with validations and relationships (models folder)

2. **API Development**:

   - Express.js is used to create RESTful API endpoints for managing resources like Bootcamps, Courses, Reviews, and Users.
   - API endpoints are modularized into different route files for scalability and clarity.

3. **Authentication and Security**:

   - User authentication and authorization are implemented using JWT (JSON Web Tokens).
   - Password hasing is done with bcrypt for secure storage.
   - Role-based access control ensures specific actions can only be performed by authorized roles.

4. **Testing**:

   - Integration tests are written using Jest and Supertest to validate API functionality.
   - Database cleanup is performed in test cases to ensure a fresh state for every test run.

5. **Deployment**:
   - The application can be deployed on cloud platforms, with MongoDB Atlas for database hosting.
   - Environment variables are managed using a '.env' file for secure configuration.

<br>

## Features

1. **CRUD Operations**:
   Perform Create, Read, Update, and Delete operations for Bootcamps, Courses, Reviews, and Users.

2. **Authentication and Authorization**:

   - User registration and login with JWT-based authentication.
   - Role-based access control for secure access to resources.

3. **Advanced Filtering and Pagination**:

   - Query results can be filtered, sorted, and paginated based on URL parameters.

4. **Rate Limiting**:

   - Protect the API from abuse by limiting the number of requests a user can make in a specific time frame.

5. **Data Validation and Error Handling**:

   - Validate user inputs with robust schema definitions.
   - Provide meaningful error messages for incorrect requests.

6. **Database Relationships**:

   - Establish references between schemas for Bootcamp, Course, Review, and User.
   - Populate related data in API responses using Mongoose.

7. **Testing Suite**:
   - Comprehensive integration testing ensures the API functions as expected.
   - Automated tests for endpoints like Bootcamp creation and user authentication.

<br>

## API Documentation

The complete **API documentation** for the SkillBridge API is hosted on Postman. It includes detailed information about all endpoints, request/response structures, and error messages.

[➡️ SkillBridge API Documentation](https://documenter.getpostman.com/view/38855406/2sAYBUCsFT)
