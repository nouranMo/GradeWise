// import type React from "react"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Progress } from "@/components/ui/progress"

// interface AnalysisAspect {
//   score: number
//   explanation: string
//   supporting_points: string[]
// }

// interface BusinessValueProps {
//   analysis: {
//     novelty: AnalysisAspect
//     impact: AnalysisAspect
//     feasibility: AnalysisAspect
//   }
// }

// const AspectCard: React.FC<{ title: string; aspect: AnalysisAspect }> = ({ title, aspect }) => (
//   <Card>
//     <CardHeader>
//       <CardTitle className="flex justify-between items-center">
//         <span>{title}</span>
//         <span className="text-2xl font-bold">{aspect.score}/10</span>
//       </CardTitle>
//     </CardHeader>
//     <CardContent>
//       <Progress value={aspect.score * 10} className="mb-4" />
//       <p className="mb-2">{aspect.explanation}</p>
//       <ul className="list-disc pl-5">
//         {aspect.supporting_points.map((point, index) => (
//           <li key={index}>{point}</li>
//         ))}
//       </ul>
//     </CardContent>
//   </Card>
// )

// export const BusinessValueAnalysis: React.FC<BusinessValueProps> = ({ analysis }) => {
//   return (
//     <div className="space-y-6">
//       <h2 className="text-2xl font-bold mb-4">Business Value Analysis</h2>
//       <AspectCard title="Novelty" aspect={analysis.novelty} />
//       <AspectCard title="Impact" aspect={analysis.impact} />
//       <AspectCard title="Feasibility" aspect={analysis.feasibility} />
//     </div>
//   )
// }