import React, { useEffect, useState } from "react";
import "../assets/css/bookingModule.css";
import { useNavigate } from 'react-router-dom';

const BookingModal = ({
  
  isModalVisible,
  setIsModalVisible,
  selectedRooms,
  setSelectedRooms,
  customerInfo,
  setCustomerInfo,
  paymentMethod,
  setPaymentMethod,
  handleBooking,
  errorMessage,
  isBookingConfirmed,  // Nhận prop isBookingConfirmed
  isHidden,  // Nhận prop isHidden
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    const loggedInUser = localStorage.getItem("loggedInUser");
    setIsLoggedIn(loggedInUser ? true : false);
  }, []);

  useEffect(() => {
    const calculatedTotal = selectedRooms.reduce((total, room) => {
      const roomPrice = parseInt(room.price.replace(/[^\d]/g, ""), 10);
      return total + roomPrice * room.quantity;
    }, 0);
    setTotalAmount(calculatedTotal);
  }, [selectedRooms]);

  const handleRoomQuantityChange = (index, quantity) => {
    if (quantity <= 0 || isNaN(quantity)) {
      alert("Số lượng phòng phải lớn hơn 0.");
      return;
    }
    const updatedRooms = [...selectedRooms];
    updatedRooms[index].quantity = quantity;
    setSelectedRooms(updatedRooms);
  };

  const handleRoomDelete = (index) => {
    const updatedRooms = selectedRooms.filter((_, i) => i !== index);
    setSelectedRooms(updatedRooms);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo({
      ...customerInfo,
      [name]: value,
    });
  };
  const handleLoginRedirect = () => {
    navigate('/login');  // Chuyển hướng tới trang login
  };
  

  return (
    isModalVisible && (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h2 className="modal-title">Xác nhận đặt phòng</h2>
            <button
              className="close-btn"
              onClick={() => setIsModalVisible(false)}
            >
              &times;
            </button>
          </div>
          <div className="modal-body">
          {!isLoggedIn && (
            navigate('/login')
      )}

            <div className="selected-rooms">
              {selectedRooms.map((room, index) => (
                <div className="room-info" key={index}>
                  <img
                    src={room.image}
                    alt={room.name}
                    className="room-imagegg"
                  />
                  <div className="room-details">
                    <h4>{room.name}</h4>
                    <p>Giá: {room.price}</p>
                    <div className="quantity-control">
                      <label>Số lượng:</label>
                      <input
                        type="number"
                        value={room.quantity}
                        onChange={(e) =>
                          handleRoomQuantityChange(index, parseInt(e.target.value, 10))
                        }
                        min="1"
                      />
                    </div>
                  </div>
                  <button
                    className="delete-room-btn"
                    onClick={() => handleRoomDelete(index)}
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>

            <div className="customer-form">
              <h3>Thông tin khách hàng</h3>
              <input
                type="text"
                name="name"
                value={customerInfo.name}
                onChange={handleInputChange}
                placeholder="Họ và tên"
              />
              <input
                type="text"
                name="phone"
                value={customerInfo.phone}
                onChange={handleInputChange}
                placeholder="Số điện thoại"
              />
              <input
                type="email"
                name="email"
                value={customerInfo.email}
                onChange={handleInputChange}
                placeholder="Email"
              />
            </div>

            <div className="payment-method">
              <h3>Phương thức thanh toán</h3>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="payment-select"
              >
                <option value="" disabled>
                  Chọn phương thức thanh toán
                </option>
                <option value="vnpay">VNPay</option>
                <option value="momo">MoMo</option>
                <option value="cash">Tiền mặt</option>
                <option value="credit">Thanh toán bằng thẻ</option>
                
              </select>
            </div>

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            <div className="total-amount">
              <p>Tổng tiền: {totalAmount} VND</p>
            </div>

            <button
              className="confirm-btn"
              onClick={handleBooking}
              disabled={!isLoggedIn}
            >
              Xác nhận
            </button>
          </div>

          {/* Hiển thị thông báo đặt phòng thành công */}
          {isBookingConfirmed && !isHidden && (
            <div className="booking-confirmation">
              <h2>Đặt phòng thành công!</h2>
              <p>Cảm ơn bạn đã đặt phòng tại khách sạn của chúng tôi.</p>
            </div>
          )}
        </div>
      </div>
    )
  );
};

export default BookingModal;
