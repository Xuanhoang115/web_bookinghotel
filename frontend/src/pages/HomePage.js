import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/Home.css';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import Banner from '../components/Banner';

const API_BASE = 'https://web-bookinghotel-2.onrender.com';

const HomePage = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [orderInfo, setOrderInfo] = useState({
    name: '',
    email: '',
    phone: '',
    paymentMethod: '',
    quantity: 1,
  });
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const getCurrentUser = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('loggedInUser'));
      if (!stored) return null;

      const currentUser = stored.user || stored;
      return {
        ...currentUser,
        id: currentUser.id || currentUser._id,
      };
    } catch {
      return null;
    }
  };

  const formatPrice = value => {
    const price = Number(String(value ?? '').replace(/[^\d.-]/g, ''));

    return Number.isFinite(price)
      ? `${price.toLocaleString('vi-VN')} ₫`
      : 'Chưa có giá';
  };

  const getRoomImage = image => {
    const value = Array.isArray(image) ? image[0] : image;

    if (typeof value !== 'string' || !value.trim()) {
      return '/default-image.jpg';
    }

    const path = value.trim().replace(/\\/g, '/');

    if (/^https?:\/\//i.test(path)) return path;

    const uploadsIndex = path.toLowerCase().indexOf('uploads/');
    if (uploadsIndex !== -1) {
      return `${API_BASE}/${path.slice(uploadsIndex)}`;
    }

    return path;
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/rooms`);

        if (!response.ok) {
          throw new Error('Không thể tải dữ liệu phòng.');
        }

        const data = await response.json();
        setRooms(data);
      } catch (fetchError) {
        console.error('Lỗi khi lấy dữ liệu phòng:', fetchError.message);
      }
    };

    fetchRooms();
    setIsLoggedIn(Boolean(localStorage.getItem('loggedInUser')));
  }, []);

  const handleOrder = room => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    setSelectedRoom(room);
    setError('');
    setOrderInfo({
      name: '',
      email: '',
      phone: '',
      paymentMethod: '',
      quantity: 1,
    });
    setShowModal(true);
  };

  const handleRoomDetail = id => {
    navigate(`/room/${id}`);
  };

  const handleQuantityChange = delta => {
    setOrderInfo(previous => ({
      ...previous,
      quantity: Math.max(1, previous.quantity + delta),
    }));
  };

  const calculateTotalPrice = () => {
    if (!selectedRoom) return 0;

    const price = Number(
      String(selectedRoom.price ?? '').replace(/[^\d.-]/g, '')
    );

    if (!Number.isFinite(price)) return 0;

    return price * orderInfo.quantity;
  };

  const renderStars = rating => {
    const safeRating = Number(rating);

    if (!Number.isFinite(safeRating) || safeRating < 0 || safeRating > 5) {
      return null;
    }

    const fullStars = Math.floor(safeRating);
    const halfStar = safeRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <>
        {Array.from({ length: fullStars }).map((_, index) => (
          <FaStar key={`full-${index}`} color="#ffc107" />
        ))}
        {halfStar && <FaStarHalfAlt color="#ffc107" />}
        {Array.from({ length: emptyStars }).map((_, index) => (
          <FaRegStar key={`empty-${index}`} color="#ffc107" />
        ))}
      </>
    );
  };

  const handleOrderSubmit = async () => {
    if (!selectedRoom) {
      setError('Bạn chưa chọn phòng.');
      return;
    }

    if (!orderInfo.name || !orderInfo.email || !orderInfo.phone) {
      setError('Vui lòng điền đầy đủ thông tin khách hàng.');
      return;
    }

    if (!orderInfo.paymentMethod) {
      setError('Vui lòng chọn phương thức thanh toán.');
      return;
    }

    const currentUser = getCurrentUser();

    if (!currentUser?.id) {
      setError('Không xác định được tài khoản. Vui lòng đăng nhập lại.');
      return;
    }

    const bookingData = {
      userId: currentUser.id,
      roomId: selectedRoom._id,
      name: orderInfo.name,
      email: orderInfo.email,
      phone: orderInfo.phone,
      paymentMethod: orderInfo.paymentMethod,
      quantity: orderInfo.quantity,
      totalPrice: calculateTotalPrice(),
    };

    setIsSubmitting(true);
    setError('');

    try {
      const bookingResponse = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const bookingResult = await bookingResponse.json();

      if (!bookingResponse.ok) {
        throw new Error(bookingResult.message || 'Lỗi khi đặt phòng.');
      }

      // Backend có thể trả { booking, payment } hoặc trả thẳng booking
      const booking = bookingResult.booking || bookingResult;

      if (!booking?._id) {
        throw new Error('Backend chưa trả về mã đơn đặt phòng.');
      }

      if (
        orderInfo.paymentMethod === 'card' ||
        orderInfo.paymentMethod === 'vnpay'
      ) {
        const paymentResponse = await fetch(
          `${API_BASE}/api/payments/${booking._id}/create-payment-url`,
          { method: 'POST' }
        );

        const paymentResult = await paymentResponse.json();

        if (!paymentResponse.ok) {
          throw new Error(
            paymentResult.message || 'Không tạo được link thanh toán.'
          );
        }

        if (!paymentResult.paymentUrl) {
          throw new Error('Backend không trả về paymentUrl.');
        }

        window.location.assign(paymentResult.paymentUrl);
        return;
      }

      if (orderInfo.paymentMethod === 'momo') {
        throw new Error('Backend chưa có route tạo link thanh toán MoMo.');
      }

      setShowModal(false);
      setOrderInfo({
        name: '',
        email: '',
        phone: '',
        paymentMethod: '',
        quantity: 1,
      });
      alert('Đã tạo đơn. Bạn thanh toán khi nhận phòng.');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const topRooms = [...rooms]
    .filter(room => typeof room.reviews === 'number')
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, 4);

  const renderRoomCard = room => (
    <div
      className="hotel-item"
      key={room._id}
      onDoubleClick={() => handleRoomDetail(room._id)}
    >
      <div className="room-image">
        <img
          src={getRoomImage(room.image)}
          alt={room.name}
          onError={event => {
            event.currentTarget.style.display = 'none';
            event.currentTarget.parentElement.classList.add('image-error');
          }}
        />
      </div>

      <h3>{room.name}</h3>
      <p>{room.address}</p>

      <p className="price">
        <strong>Giá từ: {formatPrice(room.price)}/đêm</strong>
      </p>

      <div className="rating">
        {renderStars(room.rating)}
        <div className="rating-info">
          <span>{room.rating}</span>
          <span> ({room.reviews} đánh giá)</span>
        </div>
      </div>

      <button onClick={() => handleOrder(room)}>Đặt ngay</button>
    </div>
  );

  return (
    <div className="homepage">
      <Banner />

      <div className="promotion">
        <div className="hotel-list">
          <h3>Danh sách khách sạn được yêu thích nhất tại đây</h3>
          <div className="hotel-grid">{rooms.map(renderRoomCard)}</div>
        </div>

        <div className="hotel-list">
          <h3>Danh sách khách sạn nổi bật</h3>
          <div className="hotel-grid">{topRooms.map(renderRoomCard)}</div>
        </div>
      </div>

      {showModal && selectedRoom && (
        <div className="modal show">
          <div className="modal-content">
            <h2>Thông tin đặt phòng</h2>

            <div className="product-info">
              <img
                src={getRoomImage(selectedRoom.image)}
                alt={selectedRoom.name}
              />

              <div className="product-details">
                <h3>{selectedRoom.name}</h3>
                <p>Giá: {formatPrice(selectedRoom.price)}/đêm</p>

                <div className="quantity">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                  >
                    -
                  </button>
                  <span>{orderInfo.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                  >
                    +
                  </button>
                </div>

                <div className="total-price">
                  <strong>
                    Tổng giá: {formatPrice(calculateTotalPrice())}
                  </strong>
                </div>
              </div>
            </div>

            <div className="customer-info">
              <input
                type="text"
                placeholder="Tên của bạn"
                value={orderInfo.name}
                onChange={event =>
                  setOrderInfo({ ...orderInfo, name: event.target.value })
                }
              />

              <input
                type="email"
                placeholder="Email"
                value={orderInfo.email}
                onChange={event =>
                  setOrderInfo({ ...orderInfo, email: event.target.value })
                }
              />

              <input
                type="text"
                placeholder="Số điện thoại"
                value={orderInfo.phone}
                onChange={event =>
                  setOrderInfo({ ...orderInfo, phone: event.target.value })
                }
              />

              <select
                value={orderInfo.paymentMethod}
                onChange={event =>
                  setOrderInfo({
                    ...orderInfo,
                    paymentMethod: event.target.value,
                  })
                }
              >
                <option value="">Chọn phương thức thanh toán</option>
                <option value="vnpay">VNPay</option>
                <option value="momo">MoMo</option>
                <option value="pay_at_hotel">
                  Thanh toán khi nhận phòng
                </option>
                <option value="card">Thanh toán bằng thẻ</option>
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleOrderSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;