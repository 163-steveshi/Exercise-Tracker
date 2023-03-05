'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //use last 10 digit for current Date
  click = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; //in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    // prettier-ignore
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} 
    on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
  clicks() {
    this.click++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min per km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km /h

    this.speed = this.distance / (this.duration / 60);

    return this.speed;
  }
}

//||||||||||||||||||||||||||||||||||||||||||||||
//||||||||||||||||||||||||||||||||||||||||||||||
//||||||||||||||||||||||||||||||||||||||||||||||
//Application Architecture
//implement app constructor
class App {
  //private instance
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  //call this function when object is created
  constructor() {
    this._getPosition();
    //get data from local storage
    this._getLocalStorage();
    //attach eventHandler
    //by default, this points to form, use bind to point to app object
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField); //change candence and Elevation base on activity
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      //this is undefine becasue of call back function property need bind otherwise this points to null
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this));
    } else alert('Could not get your position');
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude]; //varibale for record user's cooridinate
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // event handler function for click on map
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    //first show the form for user to choose which pin represents for
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    //add hidden style back
    form.style.display = 'none';
    form.classList.add('hidden');
    //change style of form back to orginal style
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    //switch candence and Elevation base on activity

    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault(); //prevent reload default behavior in order to pin on the map
    //Get Data from  form

    const type = inputType.value;
    //default input on html web is string

    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    let workout;
    //read the latitude and longitude from the ping we click
    const { lat, lng } = this.#mapEvent.latlng;

    //function check if data is valid
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const allPositive = (...inputs) => inputs.every(input => input > 0);
    //if workout is running, create running objct
    if (type === 'running') {
      const cadence = Number(inputCadence.value);
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Please input a valid number');
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //if workout is cycling, create cycling objct
    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      )
        return alert('Please input a valid number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //add to the object array and prepare for showing on the map
    this.#workouts.push(workout);

    //show the pin/ workout on map

    //ping and mark the location we click on the map
    //bingPopup: show what message beside the ping
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);

    //hide form + clear input fields after add one actvity to the form
    this._hideForm();

    //set localStorge to store all workouts
    this._setLocalStorge();
  }

  //render workput  on map as marker /pin
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  //show work out on the left form
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    //get the element of the pin information
    //with the help of element's id attribute
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return; //error handler for null problem
    //find the required workout by comparing id with web selected one
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorge() {
    //a local api that browswer provides us
    //it is a key-value pair
    //first parameter(key) is name, second value must be string
    //convert object to strinfg
    //please store minimum data, too much local data slow down the reloading speed for webpage
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    //convert string back to object
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    //prevent null error
    if (!data) return;
    this.#workouts = data; //assign app object workout storage is local storage
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  //clear the localStorage
  reset() {
    localStorage.removeItem('workouts');
    location.reload(); //reload the page
  }
}
//get user current  geological location
const app = new App();
