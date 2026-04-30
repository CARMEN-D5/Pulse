class Domain {
    constructor() {
        this.actionScore = 0
        this.refectionScore = 0
        this.consistencyScore = 0
        this.domainScore = this.updateDomainScore()
    }

    constructor(actionScore, reflectionScore, consistencyScore) {
        this.actionScore = actionScore
        this.reflectionScore = reflectionScore
        this.consistencyScore = consistencyScore
        this.domainScore = this.updateDomainScore()
    }
    updateDomainScore(){
        return 0.3 * this.actionScore + 0.4 * this.reflectionScore + 0.3 * this.consistencyScore
    }

    getScore(){
        return this.domainScore
    }

    storeDomain(){

    }

    retrieveDomain(){

    }



}

module.exports = Domain