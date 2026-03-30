import React from 'react'
import Header from '../components/Header'
import SpecialityMenu from '../components/SpecialityMenu'
import TopDoctors from '../components/TopDoctors'
import Banner from '../components/Banner'
import SubscriptionCard from '../components/Subcriptioncard'

const Home = () => {
  return (
    <div>
        <Header />
        <SpecialityMenu />
        <TopDoctors />
        <SubscriptionCard />
        <Banner />
    </div>
  )
}

export default Home
