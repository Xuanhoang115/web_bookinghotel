const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    method: {
      type: String,
  enum: ['card', 'momo', 'vnpay', 'pay_at_hotel'],
        required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    // Mã giao dịch do website tạo, dùng để đối chiếu với cổng thanh toán
    transactionRef: {
      type: String,
      required: true,
      unique: true,
    },

    // Mã giao dịch trả về từ VNPay/MoMo
    providerTransactionId: {
      type: String,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    providerResponseCode: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);