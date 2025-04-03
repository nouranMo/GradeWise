import React from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import lastCallImage from "assets/images/last-call.svg";

export default function LastCall() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-50/50 to-gray-50/10 pointer-events-none" />

      {/* Particle effect background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#ff6464] rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{
              repeat: Infinity,
              duration: Math.random() * 3 + 2,
              delay: Math.random() * 2,
            }}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div
        ref={ref}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center"
      >
        {/* Text and CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mb-16 relative z-10"
        >
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-8 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Documentation is hard enough. <br /> Let us give you a hand.
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative z-20"
          >
            <Link
              to="/login"
              className="group flex items-center gap-2 self-center justify-self-center mt-20 w-fit rounded-md font-medium bg-[#ff6464] text-white py-4 px-8 text-md hover:bg-[#ff4444] transition-all duration-300"
            >
              Get Started{" "}
              <ArrowRightIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Decorative elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.8 }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-1/4 left-10 w-2 h-2 bg-[#ff6464] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-10 w-2 h-2 bg-[#ff6464] rounded-full animate-pulse" />
          <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-[#ff6464] rounded-full animate-pulse opacity-75" />
          <div className="absolute bottom-1/2 right-1/4 w-3 h-3 bg-[#ff6464] rounded-full animate-pulse opacity-75" />
        </motion.div>

        {/* Image at the bottom */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.6 }}
          className="relative mt-auto"
        >
          {/* Glow effect behind the image */}
          <div className="absolute -inset-4 bg-[#ff6464]/10 rounded-full blur-3xl" />

          <img
            src={lastCallImage}
            width={1000}
            height={760}
            alt="Last call illustration"
            className="relative max-w-full h-auto -mb-32"
          />
        </motion.div>
      </div>
    </section>
  );
}
