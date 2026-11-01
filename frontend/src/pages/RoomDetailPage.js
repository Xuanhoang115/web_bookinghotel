  import React, { useState, useEffect } from 'react';
  import { useParams } from 'react-router-dom';
  import BookingModal from '../components/BookingModal';
  import '../assets/css/RoomDetail.css';
  import {
    FaWifi, FaSwimmer, FaBed, FaShower, FaCar, FaTv, FaCogs,
    FaSmokingBan, FaLeaf, FaRegLightbulb
  } from 'react-icons/fa';

  const facilityIcons = {
    FaWifi,
    FaSwimmer,
    FaBed,
    FaShower,
    FaCar,
    FaTv,
    FaCogs,
    FaSmokingBan,
    FaLeaf,
    FaRegLightbulb,
  };

  const RoomDetailPage = () => {
    const { id } = useParams();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [newReview, setNewReview] = useState("");
    const [reviews, setReviews] = useState([]);
  const storedUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
const user = storedUser?.user || storedUser;
const userId = user?.id || user?._id;
const userName = user?.fullName || "Khách hàng mới";

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRooms, setSelectedRooms] = useState([]);
    const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", email: "" });
    const [paymentMethod, setPaymentMethod] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const getRoomImage = (image) => {
  const value = Array.isArray(image) ? image[0] : image;

  if (typeof value !== 'string' || !value.trim()) return '';

  const path = value.trim().replace(/\\/g, '/');

  if (/^https?:\/\//i.test(path)) return path;

  const uploadsIndex = path.toLowerCase().indexOf('uploads/');
  if (uploadsIndex !== -1) {
    return `https://web-bookinghotel-2.onrender.com/${path.slice(uploadsIndex)}`;
  }

  return path;
};
    // Gọi API khi component mount
    useEffect(() => {
      const fetchRoom = async () => {
        try {
          const response = await fetch(`https://web-bookinghotel-2.onrender.com/api/rooms/${id}`);
          if (!response.ok) throw new Error('Không tìm thấy phòng');
          const data = await response.json();
          setRoom(data);
          setSelectedRooms([{
            name: data.name,
            price: data.price,
            quantity: 1,
            image: data.image
          }]);
          setReviews(data.reviews || []);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchRoom();
    }, [id]);

  const calculateTotalAmount = () =>
    selectedRooms.reduce((total, room) => {
      const price = typeof room.price === 'string'
        ? parseFloat(room.price.replace(/[^\d.-]/g, ''))
        : room.price;
      return total + price * room.quantity;
    }, 0);


  const handleBooking = async () => {
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      setErrorMessage("Vui lòng điền đầy đủ thông tin khách hàng.");
      return;
    }

    const bookingData = {
      userId: user?.id,   // ✅ giống HomePage
      roomId: room._id,
      name: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      paymentMethod: paymentMethod,
      quantity: selectedRooms[0]?.quantity || 1,
      totalPrice: calculateTotalAmount(),
    };

    try {
      const res = await fetch('https://web-bookinghotel-2.onrender.com/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });
      const data = await res.json(); // 👉 lấy dữ liệu trả về từ server
  console.log("Booking created:", data); // ✅ Log kết quả

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Lỗi khi đặt phòng');
      }
      setIsBookingConfirmed(true);
      setIsModalVisible(false);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };
    const handleAddReview = () => {
      if (newReview.trim()) {
        const newReviewObj = {
          name: userName,
          date: new Date().toLocaleDateString(),
          comment: newReview,
          rating: 5
        };
        setReviews([newReviewObj, ...reviews]);
        setNewReview("");
      }
    };

    if (loading) return <p>Đang tải...</p>;
    if (error || !room) return <p>{error || "Không tìm thấy phòng."}</p>;

    return (
      <div className="room-detail-page">
        <div className="room-detail-header">
          <h1>{room.name}</h1>
          <p className="room-location">{room.address}</p>
        </div>

        <div className="room-detail-body">
          <div className="room-image-gallery">
<img
  className="main-room-image"
  src={getRoomImage(room.image)}
  alt={room.name}
/>            <div className="image-thumbnails">
              {room.imageGallery?.map((img, idx) => (
                <img key={idx} className="thumbnail-image" src={img} alt={`Thumbnail ${idx + 1}`} />
              ))}
            </div>
          </div>

          <div className="room-infoaa">
            <h2>Thông tin phòng</h2>
            <p><strong>Giá: {room.price}đ / đêm</strong></p>
            <p>{room.description}</p>

            <div className="room-amenities">
              <h3>Tiện ích phòng</h3>
              <div className="amenity-icons">
                {(room.amenities || []).map((amenity, index) => (
                  <div className="amenity-item" key={`${amenity}-${index}`}>
                    <FaRegLightbulb />
                    <p>{amenity}</p>
                  </div>
                ))}
                {!(room.amenities || []).length && (
                  <p>Phòng này chưa có tiện ích được cập nhật.</p>
                )}
              </div>
            </div>

            <div className="room-rules">
              <h3>Quy định phòng</h3>
              <div className="rule-icons">
                {(room.facilities || []).filter(facility => facility.type === 'rule').map(facility => {
                  const Icon = facilityIcons[facility.icon] || FaRegLightbulb;
                  return (
                    <div className="rule-item" key={facility._id || facility.key}>
                      <Icon />
                      <p>{facility.label || facility.lable}</p>
                    </div>
                  );
                })}
                {!(room.facilities || []).some(facility => facility.type === 'rule') && (
                  <p>Chưa có quy định phòng được cập nhật.</p>
                )}
              </div>
            </div>

            <div className="room-booking">
              <button className="book-now-button" onClick={() => setIsModalVisible(true)}>Đặt ngay</button>
            </div>
          </div>
        </div>

        <BookingModal
          isModalVisible={isModalVisible}
          setIsModalVisible={setIsModalVisible}
          selectedRooms={selectedRooms}
          setSelectedRooms={setSelectedRooms}
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          handleBooking={handleBooking}
          errorMessage={errorMessage}
          calculateTotalAmount={calculateTotalAmount}
          isBookingConfirmed={isBookingConfirmed}
          isHidden={isHidden}
        />

        {isBookingConfirmed && !isHidden && (
          <div className="booking-confirmation">
            <h2>Đặt phòng thành công!</h2>
            <p>Cảm ơn bạn đã đặt phòng tại khách sạn của chúng tôi.</p>
          </div>
        )}

        <div className="room-review">
          <h3>Đánh giá khách hàng</h3>
          <div className="review-list">
            {reviews.length > 0 ? (
              reviews.map((review, idx) => (
                <div key={idx} className="review-item">
                  <strong>{review.name}</strong> - <span>{review.date}</span>
                  <p>{review.comment}</p>
                  <span>⭐ {review.rating}</span>
                </div>
              ))
            ) : (
              <p>Chưa có đánh giá nào</p>
            )}
          </div>

          <div className="add-review">
            <textarea
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="Nhập đánh giá của bạn..."
            ></textarea>
            <button onClick={handleAddReview}>Gửi đánh giá</button>
          </div>
        </div>
      </div>
    );
  };

  export default RoomDetailPage;
