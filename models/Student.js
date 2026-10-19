const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name:  { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    course:{ type: String, required: true },
    year:  { type: Number, required: true, min: 1, max: 5 }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);