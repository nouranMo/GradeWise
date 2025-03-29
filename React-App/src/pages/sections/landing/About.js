import React from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

export default function About() {
  const [contentRef, contentInView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const features = [
    "Inconsistencies in documentation",
    "Missing references and links",
    "Requirements traceability",
    "Compliance with standards",
  ];

  return (
    <section className="relative mt-20">
      {/* Wave SVG with animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <svg
          className="w-full h-auto -mb-1 text-[#ff6464]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            fillOpacity="1"
            d="M0,128 C480,200 960,50 1440,128 L1440,320 L0,320 Z"
          ></path>
        </svg>
      </motion.div>

      {/* Content Section */}
      <div className="bg-[#ff6464] min-h-[60vh] py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div
            ref={contentRef}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={contentInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                About GradeWise
              </h2>
              <motion.div
                initial={{ width: 0 }}
                animate={contentInView ? { width: "5rem" } : {}}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="h-1 bg-white rounded-full"
              />
              <p className="text-white/80 text-lg font-light">
                Transforming document review through AI-powered analysis
              </p>
            </motion.div>

            {/* Right Column */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={contentInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300"
            >
              <p className="text-white text-lg leading-relaxed">
                GradeWise simplifies the review of Software Requirements
                Specifications (SRS) and Software Design Documents (SDD) by
                automatically checking for:
              </p>

              {/* Feature List */}
              <ul className="mt-6 space-y-4">
                {features.map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={contentInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                    className="flex items-center text-white"
                  >
                    <svg
                      className="w-5 h-5 mr-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </motion.li>
                ))}
              </ul>

              <p className="mt-6 text-white text-lg leading-relaxed">
                Our system generates comprehensive reports with actionable
                suggestions, significantly reducing manual validation time and
                improving document quality.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Decorative Elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl"></div>
        </motion.div>
      </div>
    </section>
  );
}
