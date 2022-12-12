const mongoose = require('mongoose')
const Product = require('./productModel')
const userSchema = new mongoose.Schema({

    firstname: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },
    mobileno: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Number,
        required: true
    },
    isVerified: {
        type: Number,
        default: 1
    },

    coupons:[{
        couponCode:{
            type:String
        }
    }],

    isCouponApplied: {
        type:Number,
        default:0
    },

})

module.exports = mongoose.model('User', userSchema)