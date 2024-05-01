import ReactLoading from 'react-loading';

const ChatLoader = ({ color = 'white' }) => (
  <div className="chat-loader">
    <ReactLoading type={'bubbles'} color={color} height={12} width={40} />
  </div>
);

export default ChatLoader;
