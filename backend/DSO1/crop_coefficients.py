# FAO-56 crop coefficients
CROP_KC = {
    "wheat": {"initial": 0.3, "mid": 1.15, "late": 0.4},
    "tomato": {"initial": 0.6, "mid": 1.15, "late": 0.8},
    "maize": {"initial": 0.3, "mid": 1.2, "late": 0.6},
    "barley": {"initial": 0.3, "mid": 1.15, "late": 0.25},
}

def get_kc(crop, growth_stage):
    if crop.lower() in CROP_KC:
        return CROP_KC[crop.lower()].get(growth_stage, 1.0)
    return 1.0