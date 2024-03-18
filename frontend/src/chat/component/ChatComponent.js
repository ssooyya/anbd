import React, { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { fetchWithToken } from '../../user/Reissue';
import { useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
// import styles from '../css/chat.module.css'

const ChatComponent = (props) => {

  const product = props.product;

  const [message, setMessage] = useState('');
  const [roomId, setRoomId] = useState("");
  const [stompClient, setStompClient] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  console.log(product);
  const [user, setUser] = useState({
    username: "",
    password: "",
    // repassword: "",
    name: "",
    nickname: "",
    phone_number: "",
    email: "",
    region: "",
    auth: "", // 추가: 사용자 권한 정보,
    thumbnail : "",
  });


  const token = localStorage.getItem("accessToken");
  const apiUrl = process.env.REACT_APP_API_BASE_URL;
  const decodedToken = jwtDecode(token);
  const username = decodedToken.sub;
  console.log(decodedToken);
  console.log(JSON.stringify({ username: product.userName, productId: product.id }));

useEffect(() => {
  const createRoom = async () => {
    console.log(apiUrl);
    try {
      const url = `${apiUrl}/api/chat/room`;

      const options = {
        method: "POST",       
        body: JSON.stringify({ username: product.userName, productId: product.id })
      };

      const response = await fetchWithToken(url, options);
      const data = await response.json();

      console.log(data);
      setRoomId(data.id);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  createRoom()
  
},[])
  
  useEffect(()=>{
    const getChatLog = async () => {
      console.log(apiUrl);
      try {
        const url = `${apiUrl}/api/chat/room?roomId=${roomId}`;
  
        const options = {
          method: "GET",                 
        };
        
        const response = await fetchWithToken(url, options);
        const data = await response.json();
  
        console.log([data.map( m => ({
          message:m.message,
          sender:m.sender.nickname
        }))]);
        setChatMessages(data.map( m => ({
          message:m.message,
          sender:m.sender.nickname
        })))
        
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    getChatLog()
  },[roomId])

  useEffect(()=>{  

    const userData = async () => {
      try {
        if (token) {
        
          // 서버에 사용자 정보 요청 보내기
          const response = await fetchWithToken(
            `${process.env.REACT_APP_API_BASE_URL}/api/user/info`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const additionalUserInfo = await response.json();
            // 서버에서 받은 추가 정보를 기존 사용자 정보에 합치기
            console.log(additionalUserInfo);
            setUser((prevUserInfo) => ({
              ...prevUserInfo,
              ...additionalUserInfo,
            }));
          } else {
            console.error("Failed to fetch additional user info");
          }
        } else {
          // console.log("No token found, user is not logged in");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    // userData 함수 실행 (컴포넌트가 마운트될 때 한 번만 실행하도록 빈 배열 전달)
    userData();
  },[])
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    
    client.onConnect = (frame) => {
      console.log('WebSocket Connected:', frame);
      setStompClient(client);

      // 원하는 방에 구독
        client.subscribe(`/send/${roomId}`, (message) => {
        const receivedMessage = JSON.parse(message.body);
        console.log(receivedMessage.body)
        setChatMessages((prevMessages) => [...prevMessages, {sender:receivedMessage.body.sender.nickname, message: receivedMessage.body.message}]);
      });
      
      // 성공적으로 구독했을 때 로그 출력
      console.log(`/room/${roomId} 구독 성공적으로 완료됨`);
    };

    client.onStompError = (frame) => {
      console.error('STOMP 에러:', frame);
    };

    client.activate();

    return () => {
      if (client.connected) {
        client.deactivate();
      }
    };
  }, [roomId]);

  const sendMessage = () => {
    if (stompClient && stompClient.connected) {
      
      stompClient.publish({
        destination: `/room/${roomId}`,
        body: JSON.stringify({username:username, message:message}),       
      });
      setMessage('');
    } else {
      console.error('STOMP 연결이 활성화되지 않았습니다.');
    }
  };

  return (
    <div>
      <div>
        {chatMessages.map((msg, index) => (
          <div key={index}>
            <div 
              // className={`${msg.sender === user.nickname ? styles.right : styles.left}`}
            >
              <label htmlFor={`${index}msg`}>
                {msg.sender}
              </label>
              <p id={`${index}msg`}>{msg.message}</p>
            </div>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={sendMessage}>전송</button>
    </div>
  );
};

export default ChatComponent;