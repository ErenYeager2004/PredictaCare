import SubscriptionCard from "./SubscriptionCard";

const Subscription = () => {
  const handleSubscribe = (plan) => {
    alert(`Subscribed to ${plan}!`);
  };

  return (
    <section className="flex flex-col items-center justify-center text-center">
      <h1 className="text-[36px] font-medium text-gray-900 mb-3">Welcome to Our Service</h1>
      <p className="text-[18px] text-gray-500 mb-10">Choose a plan that fits your needs</p>
      <div className="flex gap-[30px] flex-wrap justify-center">
        <SubscriptionCard onSubscribe={() => handleSubscribe("Basic")} />
        <SubscriptionCard isPopular onSubscribe={() => handleSubscribe("Pro")} />
      </div>
    </section>
  );
};

export default Subscription;
