import React from 'react';

const SubscriptionCard = ({ isPopular, onSubscribe }) => {
  return (
    <div
      className={`bg-white border ${
        isPopular ? 'border-2 border-blue-500' : 'border border-gray-200'
      } rounded-[12px] p-[30px] w-[380px] h-[450px] text-center shadow-sm transition-all duration-300 ease-in-out flex flex-col justify-between items-center cursor-pointer relative overflow-hidden hover:-translate-y-[5px] hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)] hover:border-gray-300`}
    >
      {isPopular && (
        <span className="absolute top-0 right-0 bg-blue-500 text-white text-[12px] font-semibold px-[12px] py-[6px] rounded-bl-[12px] rounded-tr-[12px]">
          Most Popular
        </span>
      )}

      {/* Plan Details */}
      <div className="mb-[20px]">
        <h3 className="text-[24px] font-semibold text-gray-800 m-0">
          {isPopular ? 'Pro' : 'Basic'}
        </h3>
        <p className="text-[36px] font-bold text-gray-900 mt-[10px] mb-0">
          {isPopular ? '₹2000' : 'FREE'}
          <span className="text-[16px] font-normal text-gray-500 ml-[4px]">{isPopular ? '/month' : ''}</span>
        </p>
      </div>

      {/* Features List */}
      <ul className="list-none p-0 m-0 flex-1 flex flex-col justify-center">
        {[
          isPopular ? 'DiagnoAI 2.0' : 'DiagnoAI Basic',
          isPopular ? 'Unlimited Access to our Advanced Model' : 'Free Access to PRO for one Prediction',
          isPopular ? 'Unlimited Access for Prediction' : 'Limited to 2 Prediction per Disease',
          isPopular ? 'Advanced Insights' : 'No Insights',
        ].map((feature, idx) => (
          <li key={idx} className="flex items-center justify-center text-[16px] text-gray-600 my-[8px]">
            <svg
              className="w-[18px] h-[18px] text-green-500 mr-[8px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {/* Subscribe Button */}
      <button
        className={`w-full py-[12px] text-white text-[16px] font-medium rounded-[8px] transition-colors duration-200 ${
          isPopular
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-900 hover:bg-gray-700'
        }`}
        onClick={onSubscribe}
      >
        Get Started
      </button>
    </div>
  );
};

export default SubscriptionCard;
