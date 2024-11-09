import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import ScrollAnimation from "../ScrollAnimation";
import landingImage from "../../images/landing.png";
import naderImage from "../../images/nader.jpg";
import zeinaImage from "../../images/zeina.jpg";
import georgeImage from "../../images/george.jpg";
import nouranImage from "../../images/nouran.jpg";

const teamMembers = [
  { name: "Nader Amir", role: "", img: naderImage },
  { name: "Nouran Mohamed", role: "", img: nouranImage },
  { name: "George Ayman", role: "", img: georgeImage },
  { name: "Zeina Hesham", role: "", img: zeinaImage },
];

function TeamSection() {
  // Using react-intersection-observer to track visibility
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  // Parent container animation for stagger effect
  const containerVariants = {
    visible: {
      transition: { staggerChildren: 0.3 },
    },
  };

  // Animation for each team member div
  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="flex flex-col h-screen px-[10%] items-center gap-14 text-sky-950" ref={ref}>
      <ScrollAnimation>
        <h2 className="text-sky-950 text-5xl pt-32">Meet the Team</h2>
      </ScrollAnimation>

      {/* Animated container with staggered children */}
      <motion.div
        className="flex flex-row justify-center items-center gap-16"
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={containerVariants}
      >
        {teamMembers.map((member, index) => (
          <motion.div
            key={index}
            className="flex flex-col justify-center items-center gap-4"
            variants={itemVariants}
          >
            <img class="w-52 rounded-full" src={member.img} alt={member.name} />
            <h2 className="text-2xl">{member.name}</h2>
            <p className="text-lg">{member.role}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default TeamSection;