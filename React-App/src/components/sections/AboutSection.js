import ScrollAnimation from "../ScrollAnimation";
import landingImage from "../../images/landing.png";

function AboutSection() {
  return (
    <div className="flex flex-row justify-between items-center h-screen px-[10%]">
      {/* Image Section */}
      <div>
        <img src={landingImage} alt="GradeWise" />
      </div>

      {/* About Text Section */}
      <div className="flex flex-col w-[50%] gap-32">
        {/* Animated Header */}
        <ScrollAnimation>
          <h2 className="text-sky-950 text-5xl">About GradeWise</h2>
        </ScrollAnimation>

        {/* Description Text */}
        <p className="text-sky-950 text-lg tracking-wide">
        GradeWise simplifies the review of Software Requirements Specifications (SRS) and Software Design Documents (SDD) by automatically checking for inconsistencies, missing references, and more. It generates a report highlighting errors and provides actionable suggestions, significantly reducing the time needed for manual validation.
        </p>
      </div>
    </div>
  );
}

export default AboutSection;