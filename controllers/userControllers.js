
const User = require('../models/userModel')
const path = require('path')
const bcrypt = require('bcrypt')
const fast2sms = require('fast-two-sms')
const session = require('express-session')
const Product = require('../models/productModel')
const Cart = require('../models/cartModel')
const Wishlist = require('../models/wishlistModel')
const Coupon = require('../models/couponModel')
const Order = require('../models/orderModel')
const { findOne, findById } = require('../models/productModel')
const { log } = require('console')
const { resolve } = require('path')
const { rejects } = require('assert')

let userSession = {
    userId: '',
}
let mobile

let USERID

const sendMessage = function (mobile, res) {
    randomOTP = Math.floor(Math.random() * 10000)
    var options = {
        authorization: 'MSOj0bTnaP8phCARmWqtzkgEV4ZN2Ff9eUxXI7iJQ5HcDBKsL1vYiamnRcMxrsjDJboyFEXl0Sk37pZq',
        message: `Your OTP verification code is ${randomOTP}`,
        numbers: [mobile]
    }

    fast2sms.sendMessage(options)
        .then((response) => {
            console.log("OTP sent succcessfully")
        }).catch((error) => {
            console.log(error)
        })
    return randomOTP;
}


const isLoggedIn = (req, res, next) => {
    if (userSession.userId) {
        console.log(userSession);
        next();
    } else {
        res.redirect('/signup');
    }
}

const isLoggedOut = (req, res, next) => {
    if (userSession.userId) {
        res.redirect('/')
    } else {
        next();
    }
}



const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash

    } catch (error) {
        console.log(error.message);
    }
}



const userSignup = (req, res) => {
    try {
        res.render('signin')
    } catch (error) {
        console.log(error.message);
    }
}


const userRegister = async (req, res) => {
    try {
        const spassword = await securePassword(req.body.password)
        const user = User({
            firstname: req.body.firstname,
            email: req.body.email,
            mobileno: req.body.mobileno,
            password: spassword,
            isAdmin: 0,
        })
        console.log(user);
        const userData = await user.save()
        USERID = userData._id
        mobile = req.body.mobileno
        if (userData) {
            const otp = sendMessage(req.body.mno)
            res.redirect('/')
            // res.render('signin', { message: "Your registration was successfull." })
        } else {
            res.render('signin', { message: "Your registration was a failure" })
        }

    } catch (error) {
        console.log(error.message);
    }
}


// const otp = async (req, res) => {

//     const otp = sendMessage(mobile, res)
//     console.log(otp)
//     res.render('otp')
// }


// const otpValidation = async (req, res) => {
//     try {
//         userSession = req.session;
//         const otp = req.body.otp;
//         if (otp == randomOTP) {
//             const validatedUser = await User.findById({ _id: USERID })
//             validatedUser.isVerified = 1
//             const test = await validatedUser.save();
//             if (test) {
//                 res.redirect('/')
//             } else {
//                 res.render('otp', { message: "Incorrect OTP" })
//             }
//         }
//     } catch (error) {
//         console.log(error.message);
//     }

// }


const index = async (req, res) => {
    try {
        if (req.session.userId) {
            const productData = await Product.find({ isDeleted: 0 }).sort({
                uploadedAt: -1
            }).limit(8)
            if (req.session.userId) {
                const userCart = await Cart.findOne({ userID: req.session.userId })
                if (userCart) {
                    const count = userCart.cartProduct.length
                    const totalprice = userCart.totalPrice
                    res.render('index', { userSession: req.session.userId, products: productData, count: count, totalprice: totalprice })
                } else {
                    res.render('index', { userSession: req.session.userId, products: productData, count: '', totalprice: '' })
                }
            }
        } else {
            const productData = await Product.find({ isDeleted: 0 }).sort({
                uploadedAt: -1
            }).limit(8)
            if (req.session.userId) {
                res.render('index', { userSession: req.session.userId, products: productData, count: '', totalprice: '' })
            } else {
                res.render('index', { userSession: req.session.userId, products: productData })
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}


const userLogin = (req, res) => {
    try {
        res.render('signin')
    }
    catch (error) {
        console.log(error.message);
    }
}


const userAuth = async (req, res) => {
    try {
        const email = req.body.email
        const password = req.body.password

        const userData = await User.findOne({ email: email })

        if (userData) {

            const passwordMatch = await bcrypt.compare(password, userData.password)
            if (passwordMatch) {
                if (userData.isVerified === 0) {
                    res.render('signin', { message: "please verify your mail" })
                }
                else {
                    req.session.userId = userData._id
                    userSession = req.session
                    res.redirect('/')
                    console.log("user logged in")
                }
            } else {
                res.render('signin', { message: "Email is incorrect" })
            }


        } else {
            res.render('signin', { message: "password is incorrect" })
        }

    } catch (error) {
        console.log(error.message);
    }
}


const userDashBoard = async (req, res) => {
    try {
        const userCart = await Cart.findOne({ userID: req.session.userId })
        const count = userCart.cartProduct.length
        const totalprice = userCart.totalPrice
        const userOrder = await Order.find({ userID: req.session.userId })
        if (userOrder) {
            res.render('dashboard', { order: userOrder, count: count, totalprice: totalprice })
        } else {
            res.render('dashboard', { count: count, totalprice: totalprice })
        }
    } catch (error) {
        console.log(error.message);
    }
}




const cart = async (req, res) => {
    try {
        if (req.session.userId) {
            let success = false
            userSession = req.session
            const userCart = await Cart.findOne({ userID: req.session.userId })
            const products = await Cart.findOne({ userID: userSession.userId }).populate('cartProduct.productID')
            if (userCart) {
                const count = userCart.cartProduct.length
                const totalprice = userCart.totalPrice
                if (userCart) {
                    products.totalPrice = 0
                    const totalPrice = products.cartProduct.reduce((acc, curr) => {
                        return acc + (curr.productID.productPrice * curr.qty)
                    }, 0)
                    products.totalPrice = totalPrice
                    await products.save()
                    console.log('entered in cart');
                    // const productData = await Cart.findOne({ userID: userSession.userId }).populate('cartProduct.productID')
                    const completeCart = await userCart.populate('cartProduct.productID')
                    const cartTotal = await Cart.findOne({ userID: userSession.userId })

                    if (completeCart) {
                        res.render('cart', { userid: userSession.userId, cartProducts: completeCart.cartProduct, totalPrice: cartTotal.totalPrice, count: count, totalprice: totalprice })
                    } else {
                        res.render('cart', { userid: userSession.userId, cartProducts: completeCart.cartProduct, totalPrice: cartTotal.totalPrice, count: count, totalprice: totalprice })
                    }

                } else {
                    res.render('cart', { userid: userSession.userId, cartProducts: '', totalPrice: '', count: '', totalprice: '' })
                }
            } else {// cartProduct error else
                res.render('cart', { userid: userSession.userId, cartProducts: '', totalPrice: '', count: '', totalprice: '' })
            }



        } else { //real item
            let success = false
            userSession = req.session
            const userCart = await Cart.findOne({ userID: req.session.userId })
            const products = await Cart.findOne({ userID: userSession.userId }).populate('cartProduct.productID')
            if (userCart) {
                products.totalPrice = 0
                const totalPrice = products.cartProduct.reduce((acc, curr) => {
                    return acc + (curr.productID.productPrice * curr.qty)
                }, 0)
                products.totalPrice = totalPrice
                await products.save()
                console.log('entered in cart');
                // const productData = await Cart.findOne({ userID: userSession.userId }).populate('cartProduct.productID')
                const completeCart = await userCart.populate('cartProduct.productID')
                const cartTotal = await Cart.findOne({ userID: userSession.userId })

                if(cartTotal){
                    if (completeCart) {
                        res.render('cart', { userid: userSession.userId, cartProducts: completeCart.cartProduct, totalPrice: cartTotal.totalPrice, count: '', totalprice: '' })
                    } else {
                        res.render('cart', { userid: userSession.userId, cartProducts: completeCart.cartProduct, totalPrice: cartTotal.totalPrice, count: '', totalprice: '' })
                    }
                }

            } else {
                res.render('cart', { userid: userSession.userId, cartProducts: '', totalPrice: '', count: '', totalprice: '' })
            }
        }

    }
    catch (error) {
        console.log(error.message);
    }
}




const deleteCart = async (req, res, next) => {
    try {
        userSession = req.session
        // const cartItem = await Cart.cartProduct.splice(_id:cartItemId)
        await Cart.findOneAndUpdate({ userID: userSession.userId }, {
            $pull: {
                cartProduct:
                    { _id: req.query.id }
            }
        })
        res.redirect('/cart')
    } catch (error) {
        console.log(error.message);
    }
}


const updateQuantity = async (req, res, next) => {
    try {
        userSession = req.session
        const arrayid = req.query.id;
        console.log(req.body.qnty);
        console.log(arrayid);
        const productData = await Cart.findOne({ userID: userSession.userId }).populate('cartProduct.productID')
        console.log(productData);
        const productIndex = productData.cartProduct.findIndex(objInItems => objInItems._id == arrayid)
        console.log('product found at: ', productIndex)
        productData.cartProduct[productIndex].qty = req.body.qnty
        await productData.save()

        res.redirect('/cart')
    } catch (error) {
        console.log(error.message);
    }
}


const addCart = async (req, res) => {
    try {
        userSession = req.session
        const productId = req.query.id
        console.log(productId);
        console.log(userSession.userId);
        const productData = await Product.findOne({ _id: productId })
        const cartData = await Cart.findOne({ userID: userSession.userId })

        if (cartData != null) {
            console.log('cartData');
            const isExisting = await Cart.findOne({ userID: req.session.userId, 'cartProduct.productID': productId })
            console.log(isExisting);

            if (isExisting != null) {
                console.log('isExisting');
                await Cart.updateOne({ userID: userSession.userId, 'cartProduct.productID': productId },
                    { $inc: { 'cartProduct.$.qty': 1 } })

                res.redirect('/product-store')
            } else {
                console.log('else');
                await Cart.updateOne({ userID: userSession.userId },
                    { $push: { cartProduct: { "productID": productId, "qty": 1, price: productData.productPrice } } })

                res.redirect('/product-store')
            }

        } else {
            const cartItems = new Cart({
                userID: req.session.userId,
                cartProduct: [{
                    productID: productId,
                    qty: 1
                }],
                totalPrice: 0
            })

            await cartItems.save();
            res.redirect('/product-store')
        }

    } catch (error) {
        console.log(error.message);
    }
}




const wishaddCart = async (req, res) => {
    try {
        console.log('Entered in Wishaddcart');
        userSession = req.session
        const productId = req.query.id
        console.log(productId);
        console.log(userSession.userId);
        const productData = await Product.findOne({ _id: productId })
        const cartData = await Cart.findOne({ userID: userSession.userId })

        if (cartData != null) {
            console.log('cartData');
            const isExisting = await Cart.findOne({ userID: userSession.userId, 'cartProduct.productID': productId })

            if (isExisting != null) {
                console.log('isExisting');
                await Cart.updateOne({ userID: userSession.userId, 'cartProduct.productID': productId },
                    { $inc: { 'cartProduct.$.qty': 1 } })
                success = true
                res.redirect('/wish-list')
            } else {
                console.log('else');
                await Cart.updateOne({ userID: userSession.userId },
                    { $push: { cartProduct: { "productID": productId, "qty": 1, price: productData.productPrice } } })
                success = true
                res.redirect('/wish-list')
            }

        } else {
            const cartItems = new Cart({
                userID: req.session.userId,
                cartProduct: [{
                    productID: productId,
                    qty: 1
                }],
                totalPrice: 0
            })

            await cartItems.save();
            success = true
            res.redirect('/wish-list')
        }

        if (success) {
            const del = await Wishlist.findOneAndUpdate({ userID: userSession.userId }, {
                $pull: {
                    wishProduct:
                        { _id: req.body.wishid }
                }
            })
        } else {
            res.redirect('/wish-list')
        }



    } catch (error) {
        console.log(error.message);
    }
}


const onClickProduct = async (req, res) => {
    try {

        const id = req.query.id
        const productData = await Product.findById({ _id: id })
        if (productData) {
            res.render('product-details', { products: productData })
        }
        else {
            res.redirect('/')
        }


    } catch (error) {
        console.log(error.message);
    }

}

const productStore = async (req, res) => {

    try {
        let search = '';
        if (req.query.search) {
            search = req.query.search;
            console.log(search);
        }

        productSearch = await Product.find({
            isDeleted: 0,
            $or: [
                {
                    productName
                        : { $regex: '.*' + search + '.*', $options: 'i' }
                },
                {
                    productInfo
                        : { $regex: '.*' + search + '.*', $options: 'i' }
                }
            ]
        });

        if (req.session.userId) {
            const userCart = await Cart.findOne({ userID: req.session.userId })
            if (userCart) {
                const userCart = await Cart.findOne({ userID: req.session.userId })
                const count = userCart.cartProduct.length
                const totalprice = userCart.totalPrice
                res.render('product-store', {
                    products: productSearch, count: count, totalprice: totalprice
                    // sub: sub,
                    // categories: productCategories,
                    // product: productSearch,
                    // totalPages: Math.ceil(count / limit),
                    // currentPage: page
                })
            } else {
                res.render('product-store', {
                    products: productSearch, count: '', totalprice: ''
                    // sub: sub,
                    // categories: productCategories,
                    // product: productSearch,
                    // totalPages: Math.ceil(count / limit),
                    // currentPage: page
                })
            }
        } else {
            res.render('product-store', {
                products: productSearch, count: '', totalprice: ''
                // sub: sub,
                // categories: productCategories,
                // product: productSearch,
                // totalPages: Math.ceil(count / limit),
                // currentPage: page
            })
        }
    } catch (error) {
        console.log(error.message);
    }

}

const checkout = async (req, res, next) => {
    try {

            const userCart = await Cart.findOne({ userID: req.session.userId })
            const count = userCart.cartProduct.length
            const totalprice = userCart.totalPrice
            const fullcart = await Cart.findOne({ userID: req.session.userId })
            const totalPrice = fullcart.totalPrice
            res.render('checkout', { message: '', totalPrice: totalPrice, count: count, totalprice: totalprice })

    } catch (error) {
        console.log(error.messsage);
    }
}

const placeOrder = async (req, res, next) => {
    try {
        console.log(req.session.userId);
        const fullcart = await Cart.findOne({ userID: userSession.userId })
        const order = new Order({
            userID: req.session.userId,
            orderName: req.body.orderName,
            ordercompanyName: req.body.ordercompanyName,
            orderCountry: req.body.orderCountry,
            orderStreetAddress: req.body.orderStreetAddress,
            orderState: req.body.orderState,
            orderCity: req.body.orderCity,
            orderZip: req.body.orderZip,
            orderPhone: req.body.orderPhone,
            orderEmail: req.body.orderEmail,
            orderNote: req.body.orderNote,
            cartProduct: fullcart.cartProduct,
            totalPrice: fullcart.totalPrice,
            paymentType: req.body.payment,
            couponCode: req.session.couponcode

        })
        if (req.body.payment != null) {
            order.save(() => {
                res.redirect('/to-payment')
            })

        } else {
            res.redirect('/check-out')
            console.log("Payment Option Not selected");
            res.send("Payment Option Not selected")
        }

    } catch (error) {
        console.log(error);
    }
}


const toPayment = async (req, res, next) => { //to get order id in payment COD
    try {
        if (req.session.userId) {
            const userCart = await Cart.findOne({ userID: req.session.userId })
            const count = userCart.cartProduct.length
            const totalprice = userCart.totalPrice
            const fullorder = await Order.findOne({ userID: req.session.userId }).sort({
                createdAt: -1
            }).limit(1)
            console.log(fullorder);
            if (fullorder) {
                res.render('toPayment', { order: fullorder, count: count, totalprice: totalprice })
            }
        } else {
            const fullorder = await Order.findOne({ userID: req.session.userId }).sort({
                createdAt: -1
            }).limit(1)
            console.log(fullorder);
            if (fullorder) {
                res.render('toPayment', { order: fullorder, count: '', totalprice: '' })
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}


const payment = async (req, res, next) => {
    try {
        await User.findOneAndUpdate({ _id: req.session.userId }, { $set: { isCouponApplied: 0 } })
        const fullorder = await Order.findOne({ userID: req.session.userId }).sort({
            createdAt: -1
        }).limit(1)  //get the lastest one how
        const orderid = fullorder._id// to get if of latest order
        if (fullorder.paymentType == "payPal") {
            res.render('paypal', { cart: '', order: fullorder })
        }
        else if (fullorder.paymentType == "razorPay") { //need to update
            res.render('orderSuccess')
        }
        else if (fullorder.paymentType == "COD") {
            const order = await Order.findOneAndUpdate({ _id: orderid }, { $set: { status: 'billed' } })
            res.render('orderSuccess')

        }
    } catch (error) {
        console.log(error.message);
    }
}


const orderSuccess = async (req, res, next) => { //for paypal and razor pay
    try {
        const del = await Cart.deleteMany({ userID: req.session.userId })
        const order = await Order.findOne({ _id: req.query.id })
        Order.status = 'billed'
        await order.save()
        res.render('orderSuccess')
    } catch (error) {
        console.log(error.message);
    }
}


const orderDetails = async (req, res) => {
    const orderid = req.query.id
    console.log('Query ID : ', orderid);
    const fullorder = await Order.findById({ _id: orderid }).populate('cartProduct.productID userID')
    const userCart = await Cart.findOne({ userID: req.session.userId })
                if (userCart) {
                    const count = userCart.cartProduct.length
                    const totalprice = userCart.totalPrice
                    res.render('orderDetails', { order: fullorder.cartProduct, Tprice: fullorder, count: count, totalprice: totalprice });
                }else{
                    res.render('orderDetails', { order: fullorder.cartProduct, Tprice: fullorder, count: '', totalprice: '' });
                }
}


const wishlist = async (req, res) => {
    try {
        if (req.session.userId) { // can be used without checking session coz the wishlist is working only when  logged in
            const userCart = await Cart.findOne({ userID: req.session.userId })
            if (userCart) {
                const count = userCart.cartProduct.length
                const totalprice = userCart.totalPrice
                userSession = req.session
                const cartData = await Cart.find()
                const userwish = await Wishlist.findOne({ userID: req.session.userId })
                const products = await Wishlist.findOne({ userID: userSession.userId }).populate('wishProduct.productID')

                console.log(userwish);
                if (userwish) {
                    console.log('entered in wishlist');
                    // const productData = await Cart.findOne({ userID: userSession.userId }).populate('cartProduct.productID')
                    const completeWish = await userwish.populate('wishProduct.productID')

                    if (completeWish) {
                        res.render('wishlist', { userid: userSession.userId, wishProducts: completeWish.wishProduct, products: cartData, count: count, totalprice: totalprice })
                    } else {
                        res.render('wishlist', { userid: userSession.userId, wishProducts: completeWish.wishProduct, count: count, totalprice: totalprice })
                    }

                } else {
                    res.render('wishlist', { userid: userSession.userId, wishProducts: '', totalPrice: '', count: count, totalprice: totalprice })
                }
            } else {
                userSession = req.session
                const cartData = await Cart.find()
                const userwish = await Wishlist.findOne({ userID: req.session.userId })
                const products = await Wishlist.findOne({ userID: userSession.userId }).populate('wishProduct.productID')

                console.log(userwish);
                if (userwish) {
                    console.log('entered in wishlist');
                    // const productData = await Cart.findOne({ userID: userSession.userId }).populate('cartProduct.productID')
                    const completeWish = await userwish.populate('wishProduct.productID')

                    if (completeWish) {
                        res.render('wishlist', { userid: userSession.userId, wishProducts: completeWish.wishProduct, products: cartData, count: '', totalprice: '' })
                    } else {
                        res.render('wishlist', { userid: userSession.userId, wishProducts: completeWish.wishProduct, count: '', totalprice: '' })
                    }

                } else {
                    res.render('wishlist', { userid: userSession.userId, wishProducts: '', totalPrice: '', count: '', totalprice: '' })
                }
            }


        } else {
            userSession = req.session
            const cartData = await Cart.find()
            const userwish = await Wishlist.findOne({ userID: req.session.userId })
            const products = await Wishlist.findOne({ userID: userSession.userId }).populate('wishProduct.productID')

            console.log(userwish);
            if (userwish) {
                console.log('entered in wishlist');
                // const productData = await Cart.findOne({ userID: userSession.userId }).populate('cartProduct.productID')
                const completeWish = await userwish.populate('wishProduct.productID')

                if (completeWish) {
                    res.render('wishlist', { userid: userSession.userId, wishProducts: completeWish.wishProduct, products: cartData, count: '', totalprice: '' })
                } else {
                    res.render('wishlist', { userid: userSession.userId, wishProducts: completeWish.wishProduct, count: '', totalprice: '' })
                }

            } else {
                res.render('wishlist', { userid: userSession.userId, wishProducts: '', totalPrice: '', count: '', totalprice: '' })
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}





const addwishlist = async (req, res) => {
    try {
        userSession = req.session
        const productId = req.query.id
        console.log(productId);
        console.log(userSession.userId);
        const productData = await Product.findOne({ _id: productId })
        const wishData = await Wishlist.findOne({ userID: userSession.userId })

        if (wishData != null) {
            const isExisting = await Wishlist.findOne({ userID: req.session.userId, 'wishProduct.productID': productId })
            console.log('is existing :', isExisting);

            if (isExisting != null) {
                console.log('Item Already exists');

                res.redirect('/product-store')
            } else {
                console.log('else');
                await Wishlist.updateOne({ userID: userSession.userId },
                    { $push: { wishProduct: { "productID": productId, price: productData.productPrice } } })

                res.redirect('/product-store')
            }

        } else {
            console.log("1");
            const wishItems = new Wishlist({
                userID: req.session.userId,
                wishProduct: [{
                    productID: productId,
                }]
            })
            await wishItems.save();
            console.log(wishItems);
            res.redirect('/product-store')
        }
    } catch (error) {
        console.log(error.message);
    }
}

const applyCoupon = async (req, res) => {
    try {
        const couponCode = req.body.couponcode
        req.session.couponcode = couponCode
        const fulluser = await User.findOneAndUpdate({ _id: req.session.userId }, { $set: { isCouponApplied: 1 } } && { $push: { coupons: { couponCode: couponCode } } })
        await User.findOneAndUpdate({ _id: req.session.userId }, { $set: { isCouponApplied: 1 } })
        const totalcoupon = await Coupon.findOne({ couponCode: couponCode })
        const totalcart = await Cart.findOne({ userID: req.session.userId })
        if (fulluser.isCouponApplied) {
            console.log('Coupons is already used');
        } else {
            console.log(totalcart);
            const totalprice = totalcart.totalPrice
            console.log('Total price is here :', totalprice);
            const newtotalprice = totalprice * (totalcoupon.couponDiscount / 100)
            totalcart.totalPrice = newtotalprice
            await totalcart.save()
        }

        res.redirect('/check-out')
    } catch (error) {
        console.log(error.message);
    }
}

const userLogout = async (req, res) => {
    try {
        req.session.userId = ''
        userSession.userId = ''
        // req.session.userId = ''
        res.redirect('/')
    } catch (error) {
        console.log(error.message);
    }
}


module.exports = {
    userSignup,
    userRegister,
    index,
    // otp,
    // otpValidation,
    userLogin,
    userAuth,
    userDashBoard,
    cart,
    wishaddCart,
    onClickProduct,
    productStore,
    deleteCart,
    addCart,
    updateQuantity,
    checkout,
    placeOrder,
    orderDetails,
    toPayment,
    payment,
    orderSuccess,
    wishlist,
    addwishlist,
    applyCoupon,
    userLogout,
    isLoggedIn,
    isLoggedOut
}