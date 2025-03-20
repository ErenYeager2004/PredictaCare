import React, { useState, useEffect, useContext } from 'react';
import { assets } from '../assets/assets';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

const Header = () => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const navigate = useNavigate();
  const { token } = useContext(AppContext);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev === 0 ? 1 : 0));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleButtonClick = (link) => {
    if (link === '#prediction') {
      if (!token) {
        navigate('/login');
      } else {
        navigate('/prediction');
      }
    } else if (link.startsWith('#')) {
      // Scroll to section within the same page
      const section = document.querySelector(link);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(link);
    }
  };
  

  const banners = [
    {
      title: 'Book Appointment \n With Trusted Doctors',
      description: 'Simply browse through our extensive list of trusted doctors, schedule your appointment hassle-free.',
      buttonText: 'Book Appointment',
      buttonLink: '#speciality',
      image: assets.group_profiles,
      showImage: true
    },
    {
      title: 'Predict Diseases \n with Prediction Model',
      description: 'Leverage our AI-driven predictive technology to assess health risks early and improve outcomes.',
      extraLine: 'Your health insights, one prediction away.',
      buttonText: 'Try Predictive AI',
      buttonLink: '#prediction',
      image: null,
      showImage: false
    }
  ];

  return (
    <div className='relative w-full bg-[#5f6FFF] rounded-lg px-6 md:px-10 lg:px-20 overflow-hidden flex flex-col md:flex-row flex-wrap'>
      {/* Left Content */}
      <div className='md:w-1/2 flex flex-col items-start justify-center gap-4 py-10 m-auto md:py-[10vw] md:mb-[-30px]'>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.8 }}
            className='flex flex-col gap-4'
          >
            {/* Title */}
            <p className='text-3xl md:text-4xl lg:text-5xl text-white font-semibold leading-tight md:leading-tight lg:leading-tight whitespace-pre-line'>
              {banners[currentBanner].title}
            </p>

            {/* Description & Optional Image */}
            <div className='flex flex-col md:flex-row items-center gap-3 text-white text-sm font-light'>
              {banners[currentBanner].showImage && (
                <img className='w-20 md:w-24' src={banners[currentBanner].image} alt="icon" />
              )}

              <div className='flex flex-col gap-2 text-center md:text-left'>
                <p>{banners[currentBanner].description}</p>
              </div>
            </div>

            {/* Button */}
            <button
              className='flex items-center justify-center gap-2 bg-white px-5 py-2 md:px-6 md:py-2.5 rounded-full text-gray-600 text-sm m-auto md:m-0 hover:scale-105 transition-all duration-300 w-fit'
              onClick={() => handleButtonClick(banners[currentBanner].buttonLink)}
            >
              {banners[currentBanner].buttonText}
              <img className='w-3' src={assets.arrow_icon} alt="arrow" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right Content (Image that stays fixed) */}
      <div className='md:w-1/2 relative flex items-end justify-center'>
        <img
          className='w-full md:absolute bottom-0 h-auto rounded-lg'
          src={assets.header_img}
          alt="header"
        />
      </div>
    </div>
  );
};

export default Header;
