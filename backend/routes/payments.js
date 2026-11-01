const express = require('express');
const mongoose = require('mongoose');
const { VNPay, ignoreLogger } = require('vnpay');
const Payment = require('../models/Payment');

const router = express.Router();

// Cấu hình VNPay Sandbox
// Dùng đúng cặp TMN Code + Secret Key VNPay cấp cùng nhau.
const VNPAY_TMN_CODE = 'NI9G38S6';
const VNPAY_SECURE_SECRET = 'FCAXPJBKDMUDKEDKOJQLHPTPLXGDAKNU';

// URL backend Render nhận khách quay lại sau khi thanh toán.
// Nếu backend Render của bạn có domain khác, sửa domain này.
const VNPAY_RETURN_URL =
  'https://web-bookinghotel-2.onrender.com/api/payments/vnpay/return';

// Trang frontend nhận khách sau khi VNPay trả về
const FRONTEND_RETURN_URL = 'http://localhost:3000/booking';

const vnpay = new VNPay({
    tmnCode: "NI9G38S6",
    secureSecret:"FCAXPJBKDMUDKEDKOJQLHPTPLXGDAKNU",
    vnpayHost: "https://sandbox.vnpayment.vn",
    testMode: true,
    hashAlgorithm: "SHA512",
    enableLog: true,
    loggerFn: ignoreLogger,
    endpoints: {
        paymentEndpoint: "paymentv2/vpcpay.html",
        queryDrRefundEndpoint: "merchant_webapi/api/transaction",
        getBankListEndpoint: "qrpayauth/api/merchant/get_bank_list",
    },
});

// =================================================================
// ⚡ API 1: Tạo URL thanh toán VNPay
// =================================================================

// POST /api/payments/:bookingId/create-payment-url
// Tạo link cho payment đã được tạo trong route POST booking
router.post('/:bookingId/create-payment-url', async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: 'bookingId không hợp lệ.' });
    }

    if (
      !VNPAY_TMN_CODE ||
      !VNPAY_SECURE_SECRET ||
      VNPAY_SECURE_SECRET === 'DAN_SECRET_KEY_MOI_VAO_DAY'
    ) {
      return res.status(503).json({
        message: 'Hãy điền VNPay TMN Code và Secret Key mới vào payments.js.',
      });
    }

    const payment = await Payment.findOne({
      bookingId,
      method: { $in: ['card', 'vnpay'] },
      status: 'pending',
    });

    if (!payment) {
      return res.status(404).json({
        message: 'Không tìm thấy payment thẻ/VNPay đang chờ.',
      });
    }

    const amount = Number(payment.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Số tiền thanh toán không hợp lệ.' });
    }

    // Mã gồm ký tự hex, dùng để tìm lại Payment khi VNPay gọi IPN
    payment.transactionRef = payment._id.toString();
    await payment.save();

    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const paymentData = {
      // SDK nhận giá VND bình thường, tự nhân 100 khi tạo link
      vnp_Amount: Math.round(amount),
      vnp_IpAddr: ipAddress,
      vnp_ReturnUrl: VNPAY_RETURN_URL,
      vnp_TxnRef: payment.transactionRef,
      vnp_OrderInfo: `Thanh toan dat phong ${bookingId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
    };

    // Khách chọn thẻ thì dùng kênh thẻ quốc tế
    if (payment.method === 'card') {
      paymentData.vnp_BankCode = 'VNBANK';
    }

    const paymentUrl = vnpay.buildPaymentUrl(paymentData);

    return res.json({ paymentUrl });
  } catch (error) {
    console.error('Lỗi tạo link VNPay:', error);

    return res.status(500).json({
      message: 'Không tạo được link thanh toán.',
      error: error.message,
    });
  }
});

// GET /api/payments/vnpay/ipn
// VNPay gọi server-to-server để báo kết quả giao dịch
router.get('/vnpay/ipn', async (req, res) => {
  try {
    const result = vnpay.verifyIpnCall(req.query);

    if (!result.isVerified) {
      return res.json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const payment = await Payment.findOne({
      transactionRef: String(result.vnp_TxnRef),
    });

    if (!payment) {
      return res.json({ RspCode: '01', Message: 'Payment not found' });
    }

    if (Math.round(Number(payment.amount)) !== Number(result.vnp_Amount)) {
      return res.json({ RspCode: '04', Message: 'Invalid amount' });
    }

    if (payment.status === 'paid') {
      return res.json({ RspCode: '02', Message: 'Payment already confirmed' });
    }

    if (result.isSuccess) {
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.providerTransactionId = String(result.vnp_TransactionNo || '');
    } else {
      payment.status = 'failed';
    }

    await payment.save();

    return res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('Lỗi VNPay IPN:', error);

    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// GET /api/payments/vnpay/return
// Xác minh kết quả để chuyển khách về frontend.
// Database được cập nhật ở IPN phía trên.
router.get('/vnpay/return', (req, res) => {
  try {
    const result = vnpay.verifyReturnUrl(req.query);
    const status =
      result.isVerified && result.isSuccess ? 'success' : 'failed';

    return res.redirect(
      `${FRONTEND_RETURN_URL}?payment=${status}`
    );
  } catch (error) {
    console.error('Lỗi VNPay return:', error);
    return res.redirect(`${FRONTEND_RETURN_URL}?payment=failed`);
  }
});

module.exports = router;