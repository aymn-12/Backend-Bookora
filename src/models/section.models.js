const mongoose = require('mongoose')

const SectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    icon: {
        type: String, // lucide icon name
        default: "Library"
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
        default: null,
        index: true
    }
}, {timestamps : true})

module.exports = mongoose.model("Section" , SectionSchema);
