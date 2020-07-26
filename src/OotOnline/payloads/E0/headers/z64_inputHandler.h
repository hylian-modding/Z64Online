#ifndef Z64INPUT_H
#define Z64INPUT_H

#define STATE_UP 0
#define STATE_PRESSED 1
#define STATE_DOWN 2

typedef struct {
	uint8_t buttonOffset;
	uint8_t buttonState;
	float invokeTime;
} button_t;

typedef struct {
	z64_controller_t* controller;
	button_t a;
	button_t b;
	button_t z;
	button_t s;
	button_t du;
	button_t dd;
	button_t dl;
	button_t dr;
	button_t pad[2];
	button_t l;
	button_t r;
	button_t cu;
	button_t cd;
	button_t cl;
	button_t cr;
	float jx, jy;
	float deadzone;
	float clipzone;
	uint64_t end;
} z64_inputHandler_t;

void construct_button_t(button_t* button, uint8_t buttonOffset) {
	button->buttonOffset = buttonOffset;
	button->buttonState = STATE_UP;
	button->invokeTime = 0;
}

void construct_z64_inputHandler_t(z64_inputHandler_t* inputHandler, z64_controller_t* controller) {
	inputHandler->controller = controller;
	construct_button_t(&inputHandler->a, 0);
	construct_button_t(&inputHandler->b, 1);
	construct_button_t(&inputHandler->z, 2);
	construct_button_t(&inputHandler->s, 3);
	construct_button_t(&inputHandler->du, 4);
	construct_button_t(&inputHandler->dd, 5);
	construct_button_t(&inputHandler->dl, 6);
	construct_button_t(&inputHandler->dr, 7);
	construct_button_t(&inputHandler->l, 10);
	construct_button_t(&inputHandler->r, 11);
	construct_button_t(&inputHandler->cu, 12);
	construct_button_t(&inputHandler->cd, 13);
	construct_button_t(&inputHandler->cl, 14);
	construct_button_t(&inputHandler->cr, 15);
	inputHandler->jx = 0;
	inputHandler->jy = 0;
	inputHandler->deadzone = 0.05f;
	inputHandler->clipzone = 0.95f;
	inputHandler->end = 0xDEADBEEFBEEFDEAD;
}

void updateButton(button_t* thisButton, uint8_t buttonDown, float currentTime) {
	switch (thisButton->buttonState) 
	{
		case(STATE_UP):
			if (buttonDown) {
				thisButton->buttonState = STATE_PRESSED;
				thisButton->invokeTime = currentTime;
			}
			break;

		case(STATE_PRESSED):
			if (buttonDown) thisButton->buttonState = STATE_DOWN;
			else {
				thisButton->buttonState = STATE_UP;
				thisButton->invokeTime = 0;
			}
			break;

		case(STATE_DOWN):
			if (!buttonDown) {
				thisButton->buttonState = STATE_UP;
				thisButton->invokeTime = 0;
			}
			break;
	}
}

void update_z64_inputHandler_t(z64_inputHandler_t* inputHandler, float currentTime) {
	uint8_t buttonDown = inputHandler->controller->a;
	updateButton(&inputHandler->a, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->b;
	updateButton(&inputHandler->b, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->z;
	updateButton(&inputHandler->z, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->s;
	updateButton(&inputHandler->b, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->b;
	updateButton(&inputHandler->s, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->du;
	updateButton(&inputHandler->du, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->dd;
	updateButton(&inputHandler->dd, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->dl;
	updateButton(&inputHandler->dl, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->dr;
	updateButton(&inputHandler->dr, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->l;
	updateButton(&inputHandler->l, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->r;
	updateButton(&inputHandler->r, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->cu;
	updateButton(&inputHandler->cu, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->cd;
	updateButton(&inputHandler->cd, buttonDown, currentTime);
	
	buttonDown = inputHandler->controller->cl;
	updateButton(&inputHandler->cl, buttonDown, currentTime);

	buttonDown = inputHandler->controller->cr;
	updateButton(&inputHandler->cr, buttonDown, currentTime);

	inputHandler->jx = (float)inputHandler->controller->x / 128.0f;
	inputHandler->jy = (float)inputHandler->controller->y / 128.0f;
}

#endif


