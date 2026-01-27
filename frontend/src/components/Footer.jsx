import React from 'react'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <div className='md:mx-10'>
        <div className='flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm'>
            <div>
                <img className='mb-5 w-60' src={assets.logo} alt="" />
                <p className='w-full md:w-2/3 text-gray-600 leading-6'>Welcome to PredictaCare, your trusted partner in managing your healthcare needs conveniently and efficiently. At PredictaCare, we understand the challenges individuals face when it comes to scheduling doctor appointments and managing their health records.</p>
            </div>

            <div>
                <p className='text-xl font-medium mb-5'>COMPANY</p>
                <ul className='flex flex-col gap-2 text-gray-600'>
                    <li>Home</li>
                    <li>About us</li>
                    <li>Contact us</li>
                    <li>Privacy policy</li>
                </ul>
            </div>

            <div>
                <p className='text-xl font-medium mb-5'>GET IN TOUCH</p>
                <ul className='flex flex-col gap-2 text-gray-600'>
                    <li>+91-212-456-7890</li>
                    <li>GenzCoders</li>
                </ul>
            </div>
        </div>
        <div>
            <hr className='border-gray-400'/>
            <p className='py-5 text-sm text-center'>Copyright © 2026 GenzCoders - All Right Reserved.</p>
        </div>
    </div>
  )
}

export default Footer
