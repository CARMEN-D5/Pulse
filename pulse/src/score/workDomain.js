const Domain = require("./domain")

class WorkDomain extends Domain {
    constructor(actionScore, reflectionScore, consistencyScore){
        super(actionScore, reflectionScore, consistencyScore)
        this.domainScore = this.updateDomainScore()
    }
    updateDomainScore(){
    return super.updateDomainScore
    }
}

module.exports = WorkDomain