import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import newRobotImg from '../assets/cuteRobo1.png';

const Banner = () => {
  const navigate = useNavigate()
  const [currentBanner, setCurrentBanner] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev === 0 ? 1 : 0))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const banners = [
    {
      title: 'Book Appointment',
      subtitle: 'With 100+ Trusted Doctors',
      description: '',
      image: assets.appointment_img,
      showImage: true
    },
    {
      title: 'Predict Diseases',
      subtitle: 'With Our AI Health Assistant',
      description: 'Get personalized predictions and early risk assessments powered by advanced AI.',
      image: newRobotImg,
      showImage: true
    }
  ]

  return (
    <div className='flex bg-[#5f6FFF] rounded-lg px-6 sm:px-10 md:px-14 lg:px-12 my-20 md:mx-10 overflow-hidden'>
      {/* LEFT CONTENT */}
      <div className='flex-1 py-8 sm:py-10 md:py-24 lg:py-24 lg:pl-5 flex flex-col justify-center'>
        <div className='relative h-[250px] md:h-[300px] lg:h-[350px]'>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className='absolute top-0 left-0 right-0 flex flex-col gap-4'
            >
              <div className='text-xl sm:text-2xl md:text-3xl lg:text-5xl font-semibold text-white'>
                <p>{banners[currentBanner].title}</p>
                <p className='mt-4'>{banners[currentBanner].subtitle}</p>
              </div>

              {banners[currentBanner].description && (
                <p className='text-white text-sm sm:text-base lg:text-lg font-light mt-2 max-w-[500px]'>
                  {banners[currentBanner].description}
                </p>
              )}

              <button
                onClick={() => {
                  navigate('/login')
                  scrollTo(0, 0)
                }}
                className='bg-white text-sm sm:text-base text-gray-600 px-8 py-3 rounded-full mt-6 hover:scale-105 transition-transform duration-300 w-fit'
              >
                Create Account
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT IMAGE AREA */}
      <div className='hidden md:flex md:w-1/2 lg:w-[370px] relative justify-end items-end'>
        {banners[currentBanner].showImage && (
          <img
           className='w-[300px] md:w-[400px] lg:w-[500px] h-auto object-contain transition-opacity duration-500'
            src={banners[currentBanner].image}
            alt="banner"
          />
        )}
      </div>
    </div>
  )
}

export default Banner
