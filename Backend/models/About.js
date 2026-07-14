const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  image: { type: String, default: '' },
  text: { type: String, default: '' },
}, { _id: false });

const aboutSchema = new mongoose.Schema({
  prepMateImage: { type: String, default: '' },
  prepMateText: { type: String, default: '' },
  developers: { type: [developerSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

// Ensure only one document exists (singleton pattern)
aboutSchema.statics.getSingleton = async function () {
  let about = await this.findOne();
  if (!about) {
    about = await this.create({});
  }
  return about;
};

module.exports = mongoose.model('About', aboutSchema);
