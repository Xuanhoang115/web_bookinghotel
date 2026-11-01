const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
// 🔍 Lấy danh sách đặt phòng theo userId
router.get('/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId })
      .populate('roomId')
      .populate('userId'); // populate user để FE hiển thị tên người đặt
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy đặt phòng theo user', error: err.message });
  }
});

// 🆕 Tạo mới đơn đặt phòng
router.post('/', async (req, res) => {
  let savedBooking;

  try {
    const {
      roomId,
      userId,
      name,
      email,
      phone,
      paymentMethod,
      quantity,
    } = req.body;

    const allowedMethods = ['card', 'momo', 'vnpay', 'pay_at_hotel'];

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'roomId không hợp lệ' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'userId không hợp lệ' });
    }

    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Phòng không tồn tại' });
    }

    const roomPrice = Number(String(room.price ?? '').replace(/[^\d.-]/g, ''));
    const roomQuantity = Number(quantity);

    if (!Number.isFinite(roomPrice) || roomPrice < 0) {
      return res.status(400).json({ message: 'Giá phòng không hợp lệ' });
    }

    if (!Number.isInteger(roomQuantity) || roomQuantity < 1) {
      return res.status(400).json({ message: 'Số lượng phòng không hợp lệ' });
    }

    // Tính lại ở backend, không lấy totalPrice do frontend gửi lên
    const totalPrice = roomPrice * roomQuantity;

    const newBooking = new Booking({
      userId,
      roomId,
      name,
      email,
      phone,
      paymentMethod,
      quantity: roomQuantity,
      totalPrice,
    });

    savedBooking = await newBooking.save();

    const payment = await Payment.create({
      bookingId: savedBooking._id,
      userId,
      method: paymentMethod,
      amount: totalPrice,
      status: 'pending',
      transactionRef: `PAY-${savedBooking._id}-${Date.now()}`,
    });

    const populatedBooking = await Booking.findById(savedBooking._id)
      .populate('roomId')
      .populate('userId');

    res.status(201).json({
      booking: populatedBooking,
      payment,
    });
  } catch (error) {
    // Nếu tạo Payment thất bại thì xóa booking vừa tạo để tránh đơn thiếu thanh toán
    if (savedBooking) {
      await Booking.findByIdAndDelete(savedBooking._id).catch(() => {});
    }

    console.error('Lỗi khi đặt phòng:', error.message);
    res.status(500).json({
      message: 'Lỗi khi tạo đơn đặt phòng/thanh toán',
      error: error.message,
    });
  }
});

// 📋 Lấy danh sách tất cả đơn đặt phòng (dành cho admin)
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('roomId')
      .populate('userId'); // populate user để FE hiển thị tên người đặt
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đặt phòng', error: err.message });
  }
});

// ❌ Xoá đơn đặt phòng theo ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy đơn đặt phòng' });
    }
    res.json({ message: 'Đã huỷ đặt phòng thành công.' });
  } catch (error) {
    console.error('Lỗi khi xoá đơn đặt phòng:', error.message);
    res.status(500).json({ message: 'Lỗi khi xoá đặt phòng', error: error.message });
  }
});

module.exports = router;
