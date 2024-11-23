const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    required: [true, "Please add a title for the review"],
    maxlength: 100,
  },
  text: {
    type: String,
    required: [true, "Please add some text"],
  },
  rating: {
    type: Number,
    min: 1,
    max: 10,
    required: [true, "Please add a rating between 1 and 10"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  bootcamp: {
    type: mongoose.Schema.ObjectId,
    ref: "Bootcamp",
    required: true,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
});

//Adding an index to the ReviewSchema (Prevent user from submitting more than 1 review per bootcamp)
ReviewSchema.index({ bootcamp: 1, user: 1 }, { unique: true });

//Static method to get average rating and save
ReviewSchema.statics.getAverageRating = async function (bootcampId) {
  //Aggregated object (Pipeline of steps)
  //Will return an object having the Id of the bootcamp along with the average cost of tuitions
  const obj = await this.aggregate([
    {
      $match: { bootcamp: bootcampId },
    },
    {
      $group: {
        _id: "$bootcamp",
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  //Updating the database
  try {
    if (obj.length > 0) {
      await this.model("Bootcamp").findByIdAndUpdate(bootcampId, {
        averageRating: obj[0].averageRating,
      });
    } else {
      console.log(`No ratings found for bootcamp ${bootcampId}`);
    }
  } catch (error) {
    console.log(error);
  }
};

//Call getAverageRating after save (Through hooks)
ReviewSchema.post("save", function () {
  this.constructor.getAverageRating(this.bootcamp);
});

//Call getAverageRating before remove (Through hooks)
ReviewSchema.pre("remove", function () {
  this.constructor.getAverageRating(this.bootcamp);
});

module.exports = mongoose.model("Review", ReviewSchema);
