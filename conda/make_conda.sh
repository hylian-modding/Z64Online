#!/bin/bash
export CONDA_BLD_PATH=/mnt/d/test
conda build --channel https://repo.modloader64.com/conda/nightly --channel https://repo.modloader64.com/conda/mupen --override-channels .