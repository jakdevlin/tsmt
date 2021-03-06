// Globals

var vm = '';

// Utility functions

function sortByName(a,b) {
    if (a.player < b.player)
        return -1;
    if (a.player > b.player)
        return 1;
    return 0;
}

function copyRecordFromDefault(recordID) {
    var records = vm.$data.missions;
    var record = records.filter(function(e) { return e.id === recordID; })[0];
    record.requirements = copyRequirementsFromDefault(record.id);
    return record;
}

function copyRequirementsFromDefault(recordID) {
    var records = vm.$data.missions;
    var newRequirements = records.filter(function(e) { return e.id === recordID; })[0].requirements.map(function(oldRequirement) {
        return new Requirement(oldRequirement);
    });
    return newRequirements;
}

function updateRequirements(requirementsArray) {
    var newRequirements = [];
    newRequirements = requirementsArray.map(function(oldRequirement) {
        return new Requirement(oldRequirement);
    });
    return newRequirements;
}

function updateRecords(recordArray) {
    // Update old format records, because I'm a nice guy
    var newRecords = [];
    newRecords = recordArray.map(function(oldRecord) {
        if (typeof oldRecord.program_type == 'undefined') {
            var newRecord = copyRecordFromDefault(oldRecord.value);
            newRecord.requirements = updateRequirements(oldRecord.requirements);
            return newRecord;
        } else {
            return oldRecord;
        }
    });
    return newRecords;
}

// Main app

window.onload = function() {
    Vue.component('v-select', VueSelect.VueSelect);
    vm = new Vue({
        el: '#app',
        data: {
            missions: [],
            defaults: {version: "0.0.0", missions: [], program_types: [], durations: [], series: [], teams: [], positions: []},
            activeMissions: [],
            editingMission: new Mission({"requirements" : []}),
            selectedMission: null,
            filteredMissions: [],
            selectedFilter: null,
            selectedTeam: null
        },
        created : function() {
            var _this = this;
            jQuery.ajax({
                url: 'js/data/missions.json',
                dataType: 'json',
                async: false,
                success: function(data) {
                    _this.$data.missions = getMissionsFromData(data.missions);
                    _this.$data.defaults = data;
                    _this.$data.filteredMissions = _this.$data.missions;
                }
            });
        },
        mounted : function() {
            this.$data.activeMissions = this.getActiveMissions();
        },
        updated : function() {
            this.saveActiveMissions();
        },
        watch: {
            selectedFilter: function(newVal) {
                if (newVal != 'Team Epic') {
                    this.$data.selectedTeam = null;
                }
                this.updateProgramFilter(newVal);
            },
            selectedTeam: function(newVal) {
                this.updateTeamFilter(newVal);
            }
        },
        methods: {
            handleOK: function(evt) {
                if (this.selectedMission != null) {
                    if (!this.hasActiveMission(this.activeMissions, this.selectedMission)) {
                        var newRecord = copyRecordFromDefault(this.selectedMission.id);
                        newRecord.requirements = copyRequirementsFromDefault(this.selectedMission.id);
                        this.activeMissions.push(this.selectedMission);
                    }
                    this.selectedMission = null;
                }
            },
            handleEditOK: function(evt) {
                var _this = this;
                _this.$refs.editModal.hide();
                this.saveActiveMissions();
            },
            getActiveMissions: function() {
                var _this = this;
                var data = localStorage.getItem('CurrentActiveMissions');
                if ((data != null) && (JSON.parse(data).length > 0)) {
                    data = getMissionsFromData(updateRecords(JSON.parse(data)));
                    return data;
                } else if (localStorage.getItem('activeMissions') != null) {
                    // we have some old records to update!
                    console.log('-- old data found!');
                    return upgradeOldData(JSON.parse(localStorage.getItem('activeMissions')));
                } else {
                    return [];
                }
            },
            saveActiveMissions: function() {
                localStorage.setItem('CurrentActiveMissions', JSON.stringify(this.activeMissions));
            },
            hasActiveMission: function(arr, obj) {
                if (arr.filter(function(e) { return e.id === obj.id; }).length > 0) {
                    return true;
                } else {
                    return false;
                }
            },
            requirementIncrease: function(requirement) {
                if (requirement.current < requirement.goal) 
                    requirement.current += 1;
            },
            requirementReset: function(requirement) {
                requirement.current = 0;
            },
            requirementResetAll: function(mission) {
                var requirements = mission.requirements;
                for (var i=0; i < requirements.length; i++) {
                    requirements[i].current = 0;
                }
            },
            isRequirementComplete: function(requirement) {
                if (requirement.current >= requirement.goal) {
                    return true;
                } else {
                    return false;
                }
            },
            isRequirementStarted: function(requirement) {
                if (requirement.current > 0) {
                    return true;
                } else {
                    return false;
                }
            },
            areAllRequirementsComplete: function(mission) {
                var complete = true;
                var requirements = mission.requirements;
                for (var i=0; i < requirements.length; i++) {
                    if (requirements[i].goal > requirements[i].current) {
                        complete = false;
                    }
                }
                return complete;
            },
            removeActiveMission: function(arr, obj) {
                for (var i=0; i < arr.length; i++) {
                    if (arr[i].id == obj.id) {
                        arr.splice(i, 1);
                        break;
                    }
                }
            },
            clearActiveMissions: function() {
                this.activeMissions = [];
            },
            editMission: function(mission) {
                var _this = this;
                _this.$data.editingMission = mission;
                _this.$refs.editModal.show();
            },
            updateProgramFilter: function(selectedOption) {
                this.updateFilter();
            },
            updateTeamFilter: function(selectedOption) {
                this.updateFilter();
            },
            updateFilter: function() {
                var _this = this;
                _this.$data.filteredMissions = _this.$data.missions;
                _this.$data.selectedMission = null;
                if (_this.$data.selectedFilter != null) {
                    console.log("program type filter");
                    _this.$data.filteredMissions = _this.$data.filteredMissions.filter(function(e) { return e.program_type === _this.$data.selectedFilter; });
                }
                if (_this.$data.selectedTeam != null) {
                    console.log("team filter");
                    _this.$data.filteredMissions = _this.$data.filteredMissions.filter(function(e) { return e.team === _this.$data.selectedTeam; });
                }
            }
        }
    });
};
