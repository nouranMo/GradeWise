import React from "react";
import ReactFullpage from "@fullpage/react-fullpage";

import HeroSection from "./sections/HeroSection";
import AboutSection from "./sections/AboutSection";
import StepsSection from "./sections/StepsSection";
import TeamSection from "./sections/TeamSection";

function LandingPage() {
  return (
    <div>
      <ReactFullpage
        scrollingSpeed={1000}
        credits={false}
        render={({ state, fullpageApi }) => {
          return (
            <div>
              <div>
                <div id="hero" className="section">
                  <HeroSection />
                </div>
                <div id="about" className="section">
                  <AboutSection />
                </div>
                <div id="steps" className="section">
                  <StepsSection />
                </div>
                <div id="team" className="section">
                  <TeamSection />
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

export default LandingPage;
