import React from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import naderImage from "assets/images/nader.png";
import nouranImage from "assets/images/nouran.png";
import zeinaImage from "assets/images/zeina.png";
import georgeImage from "assets/images/george.png";
import starImage from "assets/images/star.png";

const teamMembers = [
  {
    name: "Nader Amir",
    image: naderImage,
    width: 945,
    height: 945,
    linkedin: "https://www.linkedin.com/in/naderamir/",
    github: "https://github.com/NElhamy",
  },
  {
    name: "Nouran Mohamed",
    image: nouranImage,
    width: 1440,
    height: 1440,
    linkedin: "https://www.linkedin.com/in/nouran-mohamed-111895268/",
    github: "https://github.com/nouranMo",
  },
  {
    name: "Zeina Hesham",
    image: zeinaImage,
    width: 444,
    height: 444,
    linkedin: "https://www.linkedin.com/in/zeina-hesham/",
    github: "https://github.com/gitzuzu",
  },
  {
    name: "George Ayman",
    image: georgeImage,
    width: 1000,
    height: 1000,
    linkedin: "https://www.linkedin.com/in/george-aziz/",
    github: "https://github.com/GeorgeAyy",
  },
];

const BackgroundElement = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 1 }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function Team() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="relative py-20 min-h-screen overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        {/* Stars */}
        {[...Array(4)].map((_, i) => (
          <BackgroundElement
            key={i}
            className={`absolute hidden sm:block ${
              i === 0
                ? "top-40 left-60"
                : i === 1
                ? "top-20 right-20"
                : i === 2
                ? "bottom-10 left-40"
                : "bottom-60 right-60"
            }`}
          >
            <img
              src={starImage}
              alt="decorative star"
              width={15}
              height={15}
              className="animate-shine"
            />
          </BackgroundElement>
        ))}

        {/* Dots */}
        <div className="absolute top-60 left-10 w-2 h-2 bg-[#fb918c] rounded-full animate-bounce hidden sm:block" />
        <div className="absolute -bottom-32 right-40 w-2 h-2 bg-[#fb918c] rounded-full animate-bounce hidden sm:block" />
        <div className="absolute bottom-96 left-80 w-2 h-2 bg-[#fb918c] rounded-full animate-bounce hidden sm:block" />
        <div className="absolute top-96 right-80 w-2 h-2 bg-[#fb918c] rounded-full animate-bounce hidden sm:block" />

        {/* Background Shapes */}
        <div className="absolute bottom-20 left-[-120px] w-60 h-80 bg-[#fb918c] blur-3xl opacity-50 rounded-full hidden sm:block" />
        <div className="absolute top-32 right-[-200px] w-80 h-60 bg-[#fb918c] blur-3xl opacity-50 rotate-[60deg] rounded-3xl hidden sm:block" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Meet the Team</h2>
          <div className="h-1 w-20 bg-[#ff6464] mx-auto rounded-full"></div>
        </motion.div>

        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-12 px-4 sm:px-48"
        >
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="relative"
            >
              <div className="relative w-[300px] h-[300px] mx-auto overflow-hidden group">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Overlay with social links */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {member.name}
                  </h3>

                  {/* Social Links */}
                  <div className="space-y-2">
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-white hover:text-[#ff6464] transition-colors duration-300 w-fit"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                      LinkedIn
                    </a>
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-white hover:text-[#ff6464] transition-colors duration-300 w-fit"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </a>
                  </div>
                </div>
              </div>

              {/* Name card below image */}
              <div className="w-[300px] mx-auto shadow-lg shadow-gray-300 p-4">
                <p className="text-xl font-bold text-center text-[#ff6464]">
                  {member.name}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
