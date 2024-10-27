import ScrollAnimation from "../ScrollAnimation";

function StepsSection() {
  return (
    <div className="flex flex-col h-screen justify-between">
      {/* Header Section with Animation */}
      <div>
        <ScrollAnimation>
          <h2 className="text-sky-950 text-5xl pt-32 pl-44">Three Simple Steps</h2>
        </ScrollAnimation>
      </div>

      {/* Steps Boxes Section */}
      <div className="flex flex-row justify-center items-center h-[50%]">
        {/* Step 1 */}
        <div className="bg-sky-800 w-1/3 h-full flex flex-col">
          <div className="rounded-full bg-sky-100 w-16 h-16 ml-10 mt-10 flex justify-center items-center">
            <p className="text-center text-sky-950 text-2xl font-bold">01</p>
          </div>
          <p className="self-center mt-20 text-2xl text-sky-100">Upload Document</p>
        </div>

        {/* Step 2 */}
        <div className="bg-sky-900 w-1/3 h-full flex flex-col">
          <div className="rounded-full bg-sky-100 w-16 h-16 ml-10 mt-10 flex justify-center items-center">
            <p className="text-center text-sky-950 text-2xl font-bold">02</p>
          </div>
          <p className="self-center mt-20 text-2xl text-sky-100">Run Check</p>
        </div>

        {/* Step 3 */}
        <div className="bg-sky-800 w-1/3 h-full flex flex-col">
          <div className="rounded-full bg-sky-100 w-16 h-16 ml-10 mt-10 flex justify-center items-center">
            <p className="text-center text-sky-950 text-2xl font-bold">03</p>
          </div>
          <p className="self-center mt-20 text-2xl text-sky-100">Review Report</p>
        </div>
      </div>
    </div>
  );
}

export default StepsSection;