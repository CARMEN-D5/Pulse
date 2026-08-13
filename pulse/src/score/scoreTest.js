const FinancialDomain = require("./financialDomain")
const HealthDomain = require("./healthDomain")
const RelationshipDomain = require("./relationshipDomain")
const SpiritualDomain = require("./spiritualDomain")
const WorkDomain = require("./workDomain")

let domain1 = new HealthDomain(1, 2, 3)

console.log(domain1.domainScore)