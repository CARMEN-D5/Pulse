const Domain = require("./domain")

class HealthDomain extends Domain {
    constructor(actionScore, reflectionScore, consistencyScore){
        super(actionScore, reflectionScore, consistencyScore)
        this.domainScore = this.updateDomainScore()
    }
    updateDomainScore(){
    return super.updateDomainScore
    }
}

module.exports = HealthDomain