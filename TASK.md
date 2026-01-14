Read README.md for better context about the task.

Your current task is to write a simulation software for the system to be modelled:
- solar collector
- pump
- storage tank

I want to model a transient system with changing climatic conditions:
- ambient temperature
- solar irradiance

We can skip exact sun position and base on the time series of the above values
(unless more is needed based on the equations from README? correct me if I'm wrong).

The indoor temperature (where the storage tank is located) should be constant,
but adjustable (parameter).

All parameters should be adjustable - make a config.

The simulation software should be inside a Python package. Do not put all code into main.py.
Modify pyproject.toml to turn this into a package named `passive_logic_simulator`.

I want the code to be modular.

Keep in mind that in the next steps I will want:
- a simple UI made in Typescript + React + Vite + Tailwind
- a simulation GUI in the web app
- the simulation GUI will have fields to change the parameters and a "Run simulation" button
- I will want to visualize how the system temperature progress over time
(web app is not needed yet though)
