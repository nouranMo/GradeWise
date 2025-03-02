import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  ArrowRightIcon,
  ChartBarIcon,
  ClipboardIcon,
  UserPlusIcon,
} from "@heroicons/react/20/solid";
import heroImage from "../../images/hero.png";

export default function Hero() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const features = [
    {
      icon: <ChartBarIcon className="w-6 h-6" />,
      label: "Smart Analytics",
      description: "Track document quality scores",
    },
    {
      icon: <ClipboardIcon className="w-6 h-6" />,
      label: "Version History",
      description: "Monitor your progress",
    },
    {
      icon: <UserPlusIcon className="w-6 h-6" />,
      label: "Collaboration",
      description: "Work with your team",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div ref={ref} className="flex flex-col lg:flex-row items-center gap-12">
        {/* Left Column - Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-8 lg:w-1/2"
        >
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Document Analysis,{" "}
              <span className="text-[#ff6464]">Simplified</span>
            </h1>
            <p className="text-xl text-gray-600">
              GradeWise auto-checks your SRS/SDD documents, providing instant
              feedback and saving you valuable time.
            </p>
          </div>

          <Link
            to="/login"
            className="group flex items-center gap-2 self-start rounded-md font-medium bg-[#ff6464] text-white py-3 px-5 text-sm hover:bg-[#ff4444] transition-all duration-300"
          >
            Get Started{" "}
            <ArrowRightIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12"
          >
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-lg inset-0 bg-white border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-inset-10"
              >
                <div className="p-3 bg-black text-white rounded-md shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">{feature.label}</p>
                  <p className="text-[10px] text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right Column - Image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="lg:w-1/2"
        >
          <div className="relative">
            <div className="absolute -inset-4 bg-[#ff6464]/10 rounded-xl blur-xl"></div>
            <div className="relative">
              <img
                src={heroImage}
                className="rounded-xl shadow-2xl w-full"
                alt="GradeWise dashboard preview"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
