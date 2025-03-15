import React, { useState } from "react";
import { motion } from "framer-motion";
import MediHubBot from "./MediHubBot";
import { assets } from "../assets/assets";

function Bot() {
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const handleChatClick = () => {
    setChatbotOpen(!chatbotOpen);
  };

  return (
    <div>
      <motion.div
        className="w-15 h-15 rounded-full fixed bottom-10 right-7 shadow-md shadow-blue-500 z-40 bg-white cursor-pointer m-2"
        onClick={handleChatClick}
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <img
          src={assets.chatbot}
          alt=""
          className="w-full h-full rounded-full"
        />
      </motion.div>

      {chatbotOpen ? <MediHubBot /> : ""}
    </div>
  );
}

export default Bot;
