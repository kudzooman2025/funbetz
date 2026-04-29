/**
 * Maps full team names to their logo file paths in /public/logos/
 */
export const TEAM_LOGOS: Record<string, string> = {
  "Alexandria SA":                  "/logos/alexandria-sa.jpg",
  "Baltimore Armour":               "/logos/baltimore-armour.jpg",
  "Bethesda SC":                    "/logos/bethesda-sc.jpg",
  "Carolina Core FC":               "/logos/carolina-core-fc.jpg",
  "Carolina Velocity FC":           "/logos/carolina-velocity-fc.jpg",
  "Cedar Stars Academy Monmouth":   "/logos/cedar-stars-monmouth.jpg",
  "Charlotte Independence SC":      "/logos/charlotte-independence.jpg",
  "Coppermine SC":                  "/logos/coppermine-sc.jpg",
  "FC DELCO":                       "/logos/fc-delco.jpg",
  "FC Richmond":                    "/logos/fc-richmond.jpg",
  "The Football Academy":           "/logos/football-academy.jpg",
  "Fox Soccer Academy Carolinas":   "/logos/fox-soccer.jpg",
  "Ironbound Soccer Club":          "/logos/ironbound.jpg",
  "Keystone FC":                    "/logos/keystone-fc.jpg",
  "Loudoun Soccer Club":            "/logos/loudoun-sc.jpg",
  "McLean Youth Soccer":            "/logos/mclean-youth.jpg",
  "PA Classics Harrisburg":         "/logos/pa-classics-harrisburg.jpg",
  "PA Classics":                    "/logos/pa-classics.jpg",
  "PDA Hibernian":                  "/logos/pda-hibernian.jpg",
  "Players Development Academy":    "/logos/pda.jpg",
  "The Players Progression Academy": "/logos/players-progression-academy.jpg",
  "Queen City Mutiny FC":           "/logos/queen-city-mutiny.jpg",
  "Real Futbol Academy":            "/logos/real-futbol-academy.jpg",
  "Sporting Athletic Club":         "/logos/sporting-athletic.jpg",
  "Springfield SYC":                "/logos/springfield-syc.jpg",
  "The St. James FC":               "/logos/st-james-fc.jpg",
  "Trenton City Soccer Club":       "/logos/trenton-city.jpg",
  "Triangle United SA":             "/logos/triangle-united.jpg",
  "Virginia Revolution SC":         "/logos/virginia-revolution.jpg",
  "Virginia Rush":                  "/logos/virginia-rush.jpg",
  "West Virginia Soccer":           "/logos/west-virginia-soccer.jpg",
  "Wake FC":                        "/logos/wake-fc.jpg",
};

export function getLogoUrl(teamName: string): string | null {
  r