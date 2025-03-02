import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import uploadImage from "../../images/upload.png";
import checkImage from "../../images/check.png";
import reportImage from "../../images/report.png";

const steps = [
  {
    image: uploadImage,
    title: "Upload Document",
    description: (
      <p className="text-gray-600">
        Upload your SRS/SDD document to have it auto-checked. Simply{" "}
        <Link
          to="/login" // Changed from href to to
          className="text-[#ff6464] hover:underline transition-all duration-300 font-medium"
        >
          log in
        </Link>{" "}
        to get started.
      </p>
    ),
  },
  {
    image: checkImage,
    title: "Run Check",
    description:
      "Once uploaded, just run the check so we can work on your document.",
  },
  {
    image: reportImage,
    title: "Review Report",
    description:
      "After a few minutes, you'll be redirected to the report page, where you'll find your document's feedback.",
  },
];

export default function Steps() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl font-bold mb-4 mt-40">Three Simple Steps</h2>
        <div className="h-1 w-20 bg-[#ff6464] mx-auto rounded-full"></div>
      </motion.div>

      <motion.div
        ref={ref}
        variants={containerVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="grid md:grid-cols-3 gap-12 md:gap-8"
      >
        {steps.map((step, index) => (
          <motion.div key={index} variants={itemVariants} className="relative">
            {/* Step number */}
            <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-[#ff6464] text-white flex items-center justify-center font-bold">
              {index + 1}
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* Image container */}
              <div className="relative mb-6 transform hover:scale-105 transition-transform duration-300">
                <div className="absolute inset-0 bg-[#ff6464]/10 rounded-xl blur-lg"></div>
                <img
                  src={step.image}
                  alt={`Step ${index + 1}`}
                  className="relative w-full h-48 object-contain"
                />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold mb-3">{step.title}</h3>
              <div className="text-[13px] leading-relaxed">{step.description}</div>

              {/* Connection line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-[#ff6464]"></div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Optional: CTA button at the bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="text-center mt-16"
      ></motion.div>
    </section>
  );
}
